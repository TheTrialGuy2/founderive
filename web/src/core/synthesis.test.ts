import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SYNTHESIZE_LINE, synthesizable, synthesizeLabel, type SynthesisRecord } from "./synthesis";

const conv = (path: string, over: Partial<SynthesisRecord["data"]> = {}, notes = "Notes in the founder's words."): SynthesisRecord => ({
  path,
  data: { type: "customer", date: path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf("/") + 11), observedBehavior: null, quotes: [], numbers: [], ...over },
  notes,
});

describe("synthesizable", () => {
  it("keeps confirmed customer and prospect conversations that record something, newest first", () => {
    const rows = [
      conv("conversations/2026-10-01-a.md"),
      conv("conversations/2026-10-09-b.md", { type: "prospect" }),
      conv("conversations/2026-10-05-c.md", { type: "mentor" }),
      conv("conversations/2026-10-07-d.md", { seeded: true }),
      conv("conversations/2026-10-03-e.md", {}, ""),
      conv("conversations/2026-10-08-f.md", { quotes: ["I lose my Friday"] }, ""),
    ];
    expect(synthesizable(rows).map((r) => r.path)).toEqual(["conversations/2026-10-09-b.md", "conversations/2026-10-08-f.md", "conversations/2026-10-01-a.md"]);
  });
  it("falls back to the file-name date when the record has none, and sorts ties by path", () => {
    const rows = [conv("conversations/2026-10-02-zed.md", { date: null }), conv("conversations/2026-10-02-amy.md", { date: null }), conv("conversations/2026-10-04-kim.md", { date: null })];
    expect(synthesizable(rows).map((r) => r.path)).toEqual(["conversations/2026-10-04-kim.md", "conversations/2026-10-02-amy.md", "conversations/2026-10-02-zed.md"]);
  });
  it("does not cap the list; the skill reads the first five", () => {
    const rows = Array.from({ length: 7 }, (_, i) => conv(`conversations/2026-10-0${i + 1}-p.md`));
    expect(synthesizable(rows)).toHaveLength(7);
  });
});

describe("synthesizeLabel", () => {
  it("shows nothing under three", () => {
    expect(synthesizeLabel(0)).toBeNull();
    expect(synthesizeLabel(2)).toBeNull();
  });
  it("carries the real count from three to four", () => {
    expect(synthesizeLabel(3)).toBe("Synthesize your 3 conversations");
    expect(synthesizeLabel(4)).toBe("Synthesize your 4 conversations");
  });
  it("says last 5 from five up", () => {
    expect(synthesizeLabel(5)).toBe("Synthesize your last 5 conversations");
    expect(synthesizeLabel(12)).toBe("Synthesize your last 5 conversations");
  });
});

describe("SYNTHESIZE_LINE", () => {
  it("is the exact line AGENTS.md routes to the skill", () => {
    expect(SYNTHESIZE_LINE).toBe("Synthesize my last five customer conversations in Founderive.");
  });
});

describe("the synthesis line", () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
  it("is routed by AGENTS.md (which says 'starting', so without the final period)", () => {
    expect(read("../../../AGENTS.md")).toContain(SYNTHESIZE_LINE.replace(/\.$/, ""));
  });
  it("is named by the synthesize skill", () => {
    expect(read("../../../.claude/skills/synthesize/SKILL.md")).toContain(SYNTHESIZE_LINE);
  });
});
