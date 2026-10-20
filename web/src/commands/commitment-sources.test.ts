import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTempData } from "../store/test-helpers";
import { linkedCommitmentsFor, loadLinkedCommitments, resolveCommitmentSources } from "./commitment-sources";

const DANA = "conversations/2026-10-08-dana-ortiz.md";
const PILOT = "tests/2026-10-06-paid-pilot.md";
const FOCUS = "decisions/2026-10-09-focus-on-small-agencies.md";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

const put = async (rel: string, text: string) => {
  await mkdir(path.dirname(path.join(env.dir, rel)), { recursive: true });
  await writeFile(path.join(env.dir, rel), text);
};

describe("resolveCommitmentSources", () => {
  it("names each kind of source and links to its page, reading each link once", async () => {
    const sources = await resolveCommitmentSources([DANA, PILOT, FOCUS, DANA, null, undefined, "guide:customer", "step:customer"]);
    expect([...sources.keys()].sort()).toEqual([FOCUS, DANA, PILOT].sort());
    expect(sources.get(DANA)).toEqual({ label: "From conversation with Dana Ortiz", href: "/conversations/2026-10-08-dana-ortiz" });
    expect(sources.get(PILOT)).toEqual({ label: "From test: Ask agency owners to pay for a scheduling pilot", href: "/tests/2026-10-06-paid-pilot" });
    expect(sources.get(FOCUS)).toEqual({ label: "From decision: Focus on agencies with 10-50 caregivers", href: "/decisions#2026-10-09-focus-on-small-agencies" });
  });
  it("puts a decision on page 2 when ten newer ones come first", async () => {
    for (let day = 23; day >= 14; day--) await put(`decisions/2026-10-${day}-newer-${day}.md`, `---\ntitle: Newer ${day}\ndate: 2026-10-${day}\ndecision: Continue\nwhy: Evidence\nreversible: true\n---\n`);
    expect((await resolveCommitmentSources([FOCUS])).get(FOCUS)?.href).toBe("/decisions?page=2#2026-10-09-focus-on-small-agencies");
  });
  it("omits a missing or unreadable source and keeps the rest", async () => {
    await put("conversations/2026-10-01-broken.md", "---\ntype: customer\n---\n");
    const sources = await resolveCommitmentSources(["conversations/2026-01-01-gone.md", "conversations/2026-10-01-broken.md", DANA]);
    expect([...sources.keys()]).toEqual([DANA]);
  });
});

describe("loadLinkedCommitments", () => {
  it("groups every week's commitments by link, open first, and skips repeating definitions", async () => {
    await put(
      "checkins/2026-W41.md",
      [
        "---",
        "week: 2026-W41",
        "commitments:",
        "  - id: c-old",
        "    text: Send Dana the one-pager",
        "    status: done",
        `    link: ${DANA}`,
        "  - id: c-weekly",
        "    text: Weekly post",
        "    status: open",
        `    link: ${DANA}`,
        "    repeat: { every: week, days: [tue] }",
        "---",
        "",
      ].join("\n"),
    );
    await put(
      "checkins/2026-W42.md",
      [
        "---",
        "week: 2026-W42",
        "commitments:",
        "  - id: c-1",
        "    text: Send Dana the pilot outline",
        "    due: 2026-10-16",
        "    status: open",
        `    link: ${DANA}`,
        "  - id: c-2",
        "    text: Offer five pilots",
        "    status: open",
        `    link: ${PILOT}`,
        "  - id: c-3",
        "    text: Drop this",
        "    status: dropped",
        "    reason: Changed plan",
        `    link: ${DANA}`,
        "  - id: c-4",
        "    text: Planned talk",
        "    status: open",
        "    link: step:customer",
        "---",
        "",
      ].join("\n"),
    );
    const grouped = await loadLinkedCommitments();
    expect([...grouped.keys()].sort()).toEqual([DANA, PILOT].sort());
    expect(grouped.get(DANA)).toEqual([
      { week: "2026-W42", id: "c-1", text: "Send Dana the pilot outline", due: "2026-10-16", status: "open", reason: null },
      { week: "2026-W42", id: "c-3", text: "Drop this", due: null, status: "dropped", reason: "Changed plan" },
      { week: "2026-W41", id: "c-old", text: "Send Dana the one-pager", due: null, status: "done", reason: null },
    ]);
    expect(await linkedCommitmentsFor(PILOT)).toEqual([{ week: "2026-W42", id: "c-2", text: "Offer five pilots", due: null, status: "open", reason: null }]);
    expect(await linkedCommitmentsFor(FOCUS)).toEqual([]);
  });
  it("skips a check-in it can't read without hiding the others", async () => {
    await put("checkins/2026-W41.md", "---\nweek: nope\n---\n");
    await put("checkins/2026-W42.md", `---\nweek: 2026-W42\ncommitments:\n  - id: c-1\n    text: Send Dana the pilot outline\n    status: open\n    link: ${DANA}\n---\n`);
    expect((await linkedCommitmentsFor(DANA)).map((c) => c.id)).toEqual(["c-1"]);
  });
});
