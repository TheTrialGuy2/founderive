import { writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { useTempData } from "../store/test-helpers";
import { reviewAgentEdit } from "./agent-edits";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("agent edit review", () => {
  it("keeps a block edit and preserves the previous wording in history", async () => {
    await writeFile(path.join(env.dir, "canvas/problem.md"), "---\nid: problem\ntext: New wording\nstatus: some-evidence\nagentEdit:\n  date: 2026-10-15\n  summary: Added the pilot\n  previous: Old wording\n---\nNotes\n");
    await reviewAgentEdit("canvasBlock", "canvas/problem.md", "keep");
    const entry = await readEntry("canvasBlock", "canvas/problem.md");
    expect(entry?.ok && entry.data).toMatchObject({ text: "New wording", status: "some-evidence" });
    expect(entry?.ok && entry.data.agentEdit).toBeUndefined();
    expect(entry?.ok && entry.data.seeded).toBeUndefined();
    expect(entry?.ok && entry.data.history).toEqual([{ date: "2026-10-15", text: "Old wording" }]);
  });

  it("reverts a block and preserves the agent wording in history", async () => {
    await writeFile(path.join(env.dir, "canvas/problem.md"), "---\nid: problem\ntext: New wording\nhistory:\n  - { date: 2026-10-10, text: First wording }\nagentEdit:\n  date: 2026-10-15\n  summary: Added the pilot\n  previous: Old wording\n---\n");
    await reviewAgentEdit("canvasBlock", "canvas/problem.md", "revert");
    const entry = await readEntry("canvasBlock", "canvas/problem.md");
    expect(entry?.ok && entry.data.text).toBe("Old wording");
    expect(entry?.ok && entry.data.history).toEqual([
      { date: "2026-10-10", text: "First wording" },
      { date: "2026-10-15", text: "New wording" },
    ]);
    expect(entry?.ok && entry.data.agentEdit).toBeUndefined();
  });

  it("reverts conversation notes and retains the agent version in extensions", async () => {
    const rel = "conversations/2026-10-15-dana.md";
    await writeFile(path.join(env.dir, rel), "---\ntype: customer\nperson: Dana\nagentEdit:\n  date: 2026-10-15\n  summary: Clarified the notes\n  previous: Original notes\n---\nAgent notes\n");
    await reviewAgentEdit("conversation", rel, "revert");
    const entry = await readEntry("conversation", rel);
    expect(entry?.ok && entry.body.trim()).toBe("Original notes");
    expect(entry?.ok && entry.data.extensions?.agentEditHistory).toEqual([{ date: "2026-10-15", summary: "Clarified the notes", text: "Agent notes" }]);
  });

  it("keeps conversation notes and retains the previous version in extensions", async () => {
    const rel = "conversations/2026-10-15-dana.md";
    await writeFile(path.join(env.dir, rel), "---\ntype: customer\nperson: Dana\nagentEdit:\n  date: 2026-10-15\n  summary: Clarified the notes\n  previous: Original notes\n---\nAgent notes\n");
    await reviewAgentEdit("conversation", rel, "keep");
    const entry = await readEntry("conversation", rel);
    expect(entry?.ok && entry.body.trim()).toBe("Agent notes");
    expect(entry?.ok && entry.data.extensions?.agentEditHistory).toEqual([{ date: "2026-10-15", summary: "Clarified the notes", text: "Original notes" }]);
  });
});
