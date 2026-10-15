import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTempData } from "../store/test-helpers";
import { addCommitment, appendCommitmentOnce, loadCheckin, materializeRepeatingCommitments, recordChoice, setBlocker, setCommitmentStatus, setOutcome } from "./checkin";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("check-in commands", () => {
  it("creates this week's check-in when setting the outcome", async () => {
    await setOutcome("2026-W43", "Ask three owners to pay");
    expect((await loadCheckin("2026-W43")).data.outcome).toBe("Ask three owners to pay");
  });
  it("rejects an empty outcome", async () => {
    await expect(setOutcome("2026-W43", "  ")).rejects.toThrow(/outcome/);
  });
  it("adds commitments and completes or drops them", async () => {
    const id = await addCommitment("2026-W42", { text: "Call Dana", due: "2026-10-14" });
    await setCommitmentStatus("2026-W42", id, "done");
    expect((await loadCheckin("2026-W42")).data.commitments.find((c) => c.id === id)?.status).toBe("done");
    await expect(setCommitmentStatus("2026-W42", "c-1", "dropped")).rejects.toThrow(/why/);
    await setCommitmentStatus("2026-W42", "c-1", "dropped", "They replied by phone");
    expect((await loadCheckin("2026-W42")).data.commitments.find((c) => c.id === "c-1")).toMatchObject({ status: "dropped", reason: "They replied by phone" });
  });
  it("keeps the existing outcome and body when changing other fields", async () => {
    await setBlocker("2026-W42", "No intros yet", "Intro to two agency owners");
    const { data } = await loadCheckin("2026-W42");
    expect(data).toMatchObject({ outcome: "Talk to five agency owners about scheduling", blocker: "No intros yet", helpNeeded: "Intro to two agency owners" });
  });
  it("logs dismiss/defer/replace with a reason; replace adds a commitment", async () => {
    await expect(recordChoice("2026-W42", "2026-10-13", { actionId: "guide:x", label: "X", choice: "dismissed", reason: "" })).rejects.toThrow(/reason/);
    await expect(recordChoice("2026-W42", "2026-10-13", { actionId: "guide:x", label: "X", choice: "deferred", reason: "Busy", until: "2026-10-13" })).rejects.toThrow(/later date/);
    await recordChoice("2026-W42", "2026-10-13", { actionId: "guide:x", label: "X", choice: "replaced", reason: "Better idea", replacement: "Visit two agencies" });
    const { data } = await loadCheckin("2026-W42");
    expect(data.nextStepLog[0]).toMatchObject({ actionId: "guide:x", choice: "replaced", date: "2026-10-13", via: "app" });
    expect(data.commitments.some((c) => c.text === "Visit two agencies")).toBe(true);
  });
  it("keeps both of two commitments added at the same moment", async () => {
    // allSettled so a failure in one can't leave the other writing after this test's folder is gone.
    const settled = await Promise.allSettled([addCommitment("2026-W42", { text: "Call Dana" }), addCommitment("2026-W42", { text: "Call Lee" })]);
    const [a, b] = settled.map((x) => {
      if (x.status === "rejected") throw x.reason;
      return x.value;
    });
    const ids = (await loadCheckin("2026-W42")).data.commitments.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["c-1", "c-2", a, b]));
    expect(ids).toHaveLength(4);
  });
  it("refuses to save over an invalid check-in file", async () => {
    await mkdir(path.join(env.dir, "checkins"), { recursive: true });
    await writeFile(path.join(env.dir, "checkins/2026-W44.md"), "---\nweek: nope\n---\n");
    await expect(setOutcome("2026-W44", "x")).rejects.toThrow(/Fix founder-data\/checkins\/2026-W44.md/);
  });
  it("appends a commitment once, in the one commitment shape, and doesn't rewrite the file when it's already there", async () => {
    const item = { id: "c-next", text: "Onboard the two pilots", due: "2026-10-20", link: "tests/2026-10-13-pilot.md" };
    const isIt = (c: { text: string; link?: string | null }) => c.link === item.link && c.text === item.text;
    const saved = await appendCommitmentOnce("2026-W45", item, isIt);
    expect(saved).toEqual({ ...item, status: "open", reason: null });
    const file = path.join(env.dir, "checkins/2026-W45.md");
    const before = (await stat(file)).mtimeMs;
    await new Promise((r) => setTimeout(r, 20));
    expect(await appendCommitmentOnce("2026-W45", { ...item, id: "c-other" }, isIt)).toEqual(saved);
    expect((await stat(file)).mtimeMs).toBe(before);
    expect((await loadCheckin("2026-W45")).data.commitments).toEqual([saved]);
  });
  it("materialises weekly repeats once with concrete dates and leaves the definition open", async () => {
    await writeFile(
      path.join(env.dir, "checkins/2026-W42.md"),
      "---\nweek: 2026-W42\ncommitments:\n  - id: c-post\n    text: LinkedIn personal post\n    status: open\n    repeat: { every: week, days: [tue, thu] }\n  - id: c-dms\n    text: Three DMs\n    due: sun\n    status: open\n    repeat: { every: week }\n---\n",
    );
    await materializeRepeatingCommitments("2026-W43", "2026-10-19", "2026-10-19");
    const file = path.join(env.dir, "checkins/2026-W43.md");
    const before = (await stat(file)).mtimeMs;
    await new Promise((r) => setTimeout(r, 20));
    await materializeRepeatingCommitments("2026-W43", "2026-10-19", "2026-10-19");
    expect((await stat(file)).mtimeMs).toBe(before);
    const current = (await loadCheckin("2026-W43")).data.commitments;
    expect(current).toEqual([
      { id: "c-post-2026-W42-tue-2026-W43", text: "LinkedIn personal post", due: "2026-10-20", status: "open", reason: null, link: null },
      { id: "c-post-2026-W42-thu-2026-W43", text: "LinkedIn personal post", due: "2026-10-22", status: "open", reason: null, link: null },
      { id: "c-dms-2026-W42-2026-W43", text: "Three DMs", due: "2026-10-25", status: "open", reason: null, link: null },
    ]);
    expect((await loadCheckin("2026-W42")).data.commitments.every((item) => item.status === "open" && !!item.repeat)).toBe(true);
  });
  it("starts a repeat made mid-week without creating already-overdue instances", async () => {
    await writeFile(path.join(env.dir, "checkins/2026-W43.md"), "---\nweek: 2026-W43\ncommitments:\n  - id: c-post\n    text: Weekly posts\n    status: open\n    repeat: { every: week, days: [tue, fri] }\n---\n");
    await materializeRepeatingCommitments("2026-W43", "2026-10-19", "2026-10-22");
    expect((await loadCheckin("2026-W43")).data.commitments.filter((item) => !item.repeat)).toEqual([
      { id: "c-post-2026-W43-fri-2026-W43", text: "Weekly posts", due: "2026-10-23", status: "open", reason: null, link: null },
    ]);
  });
});
