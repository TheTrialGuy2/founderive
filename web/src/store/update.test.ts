import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "./read";
import { useTempData } from "./test-helpers";
import { updateEntry } from "./update";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

const REL = "checkins/2026-W42.md";

describe("updateEntry", () => {
  it("applies a change and keeps the body", async () => {
    await updateEntry("checkin", REL, (data, body) => ({ data: { ...data!, blocker: "No intros" }, body }));
    const e = await readEntry("checkin", REL);
    expect(e?.ok && e.data).toMatchObject({ blocker: "No intros", outcome: "Talk to five agency owners about scheduling" });
  });
  it("passes null for a missing file", async () => {
    let seen: unknown = "unset";
    await updateEntry("checkin", "checkins/2026-W50.md", (data, body) => {
      seen = data;
      return { data: { week: "2026-W50", commitments: [], nextStepLog: [] }, body };
    });
    expect(seen).toBeNull();
    expect((await readEntry("checkin", "checkins/2026-W50.md"))?.ok).toBe(true);
  });
  it("refuses an invalid file", async () => {
    await writeFile(path.join(env.dir, REL), "---\nweek: nope\n---\n");
    await expect(updateEntry("checkin", REL, (data, body) => ({ data: data!, body }))).rejects.toThrow(/^Fix founder-data\/checkins\/2026-W42.md first: /);
  });
  it("retries when the file changes between read and write, so the other change isn't lost", async () => {
    let runs = 0;
    await updateEntry("checkin", REL, (data, body) => {
      runs++;
      if (runs === 1) {
        // Someone else (Claude, Codex, another tab) saves a blocker at the same moment.
        const abs = path.join(env.dir, REL);
        return readFile(abs, "utf8")
          .then((text) => writeFile(abs, text.replace("blocker: null", "blocker: Waiting on intros")))
          .then(() => ({ data: { ...data!, outcome: "Ours" }, body }));
      }
      return { data: { ...data!, outcome: "Ours" }, body };
    });
    expect(runs).toBe(2);
    const e = await readEntry("checkin", REL);
    expect(e?.ok && e.data).toMatchObject({ outcome: "Ours", blocker: "Waiting on intros" });
  });
  it("gives up after three changed attempts", async () => {
    let runs = 0;
    const abs = path.join(env.dir, REL);
    await expect(
      updateEntry("checkin", REL, async (data, body) => {
        runs++;
        await writeFile(abs, (await readFile(abs, "utf8")) + `\nedit ${runs}\n`);
        return { data: data!, body };
      }),
    ).rejects.toThrow("founder-data/checkins/2026-W42.md changed while saving. Try again.");
    expect(runs).toBe(3);
  });
  it("serializes concurrent updates to the same file", async () => {
    // allSettled so a failure in one can't leave the others writing after this test's folder is gone.
    const settled = await Promise.allSettled(
      ["a", "b", "c"].map((id) =>
        updateEntry("checkin", REL, (data, body) => ({ data: { ...data!, commitments: [...data!.commitments, { id, text: id, status: "open" as const }] }, body })),
      ),
    );
    expect(settled.map((x) => x.status)).toEqual(["fulfilled", "fulfilled", "fulfilled"]);
    const e = await readEntry("checkin", REL);
    expect(e?.ok && e.data.commitments.map((c) => c.id)).toEqual(["c-1", "c-2", "a", "b", "c"]);
  });
});
