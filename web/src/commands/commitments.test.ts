import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTempData } from "../store/test-helpers";
import { loadCheckin } from "./checkin";
import { addLinkedCommitment } from "./commitments";

const DANA = "conversations/2026-10-08-dana-ortiz.md";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("addLinkedCommitment", () => {
  it("saves the commitment in the week with the link unchanged, and leaves the source alone", async () => {
    const before = await readFile(path.join(env.dir, DANA), "utf8");
    const id = await addLinkedCommitment("2026-W42", { text: "  Send Dana the pilot outline ", due: "2026-10-16", link: DANA });
    const saved = (await loadCheckin("2026-W42")).data.commitments.find((c) => c.id === id);
    expect(saved).toMatchObject({ text: "Send Dana the pilot outline", due: "2026-10-16", status: "open", link: DANA });
    expect(await readFile(path.join(env.dir, DANA), "utf8")).toBe(before);
  });
  it("takes an empty due date as none", async () => {
    const id = await addLinkedCommitment("2026-W42", { text: "Call back", due: "", link: "decisions/2026-10-09-focus-on-small-agencies.md" });
    expect((await loadCheckin("2026-W42")).data.commitments.find((c) => c.id === id)?.due).toBeNull();
  });
  it("refuses empty text and a bad date before touching the check-in", async () => {
    await expect(addLinkedCommitment("2026-W42", { text: "  ", due: null, link: DANA })).rejects.toThrow("Write what you'll do.");
    await expect(addLinkedCommitment("2026-W42", { text: "Call", due: "next friday", link: DANA })).rejects.toThrow("Use a real date.");
    expect((await loadCheckin("2026-W42")).data.commitments).toHaveLength(2);
  });
  it("refuses a link that isn't a source record", async () => {
    for (const link of ["guide:customer", "step:customer", "program/week-01.md", "../founder.md", ""])
      await expect(addLinkedCommitment("2026-W42", { text: "Call", due: null, link })).rejects.toThrow("isn't one Founderive can link to");
  });
  it("refuses a source that is gone, and one that needs repair", async () => {
    await expect(addLinkedCommitment("2026-W42", { text: "Call", due: null, link: "conversations/2026-01-01-gone.md" })).rejects.toThrow("no longer there");
    await writeFile(path.join(env.dir, DANA), "---\ntype: customer\n---\n");
    await expect(addLinkedCommitment("2026-W42", { text: "Call", due: null, link: DANA })).rejects.toThrow("needs repair");
    expect((await loadCheckin("2026-W42")).data.commitments).toHaveLength(2);
  });
});
