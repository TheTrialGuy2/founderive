import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTempData } from "../store/test-helpers";
import { addCommitment, loadCheckin, recordChoice, setBlocker, setCommitmentStatus, setOutcome } from "./checkin";

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
    const [a, b] = await Promise.all([addCommitment("2026-W42", { text: "Call Dana" }), addCommitment("2026-W42", { text: "Call Lee" })]);
    const ids = (await loadCheckin("2026-W42")).data.commitments.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["c-1", "c-2", a, b]));
    expect(ids).toHaveLength(4);
  });
  it("refuses to save over an invalid check-in file", async () => {
    await mkdir(path.join(env.dir, "checkins"), { recursive: true });
    await writeFile(path.join(env.dir, "checkins/2026-W44.md"), "---\nweek: nope\n---\n");
    await expect(setOutcome("2026-W44", "x")).rejects.toThrow(/Fix founder-data\/checkins\/2026-W44.md/);
  });
});
