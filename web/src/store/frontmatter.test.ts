import { describe, expect, it } from "vitest";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter";

describe("frontmatter", () => {
  it("splits data and body", () => {
    expect(parseFrontmatter("---\ntitle: Hi\n---\nBody\n")).toEqual({ data: { title: "Hi" }, body: "Body\n" });
  });
  it("treats a file without frontmatter as all body", () => {
    expect(parseFrontmatter("Just text")).toEqual({ data: {}, body: "Just text" });
  });
  it("handles empty frontmatter", () => {
    expect(parseFrontmatter("---\n---\nBody")).toEqual({ data: {}, body: "Body" });
  });
  it("keeps ISO dates as strings", () => {
    expect(parseFrontmatter("---\ndue: 2026-09-22\n---\n").data).toEqual({ due: "2026-09-22" });
  });
  it("round-trips", () => {
    const text = stringifyFrontmatter({ week: 1, title: "Start" }, "Notes\n");
    expect(parseFrontmatter(text)).toEqual({ data: { week: 1, title: "Start" }, body: "Notes\n" });
  });
  it("throws on bad YAML", () => {
    expect(() => parseFrontmatter("---\ntitle: [unclosed\n---\n")).toThrow();
  });
  it("doesn't treat a `---text` line inside a block scalar as the closing fence", () => {
    const text = "---\nnotes: |\n  ---text\n  rest\n---\nBody\n";
    expect(parseFrontmatter(text)).toEqual({ data: { notes: "---text\nrest\n" }, body: "Body\n" });
  });
  it("doesn't treat `title: x\\n---not-a-fence` (no whole-line closer) as the fence", () => {
    const text = "---\ntitle: x\n---not-a-fence\n";
    expect(parseFrontmatter(text)).toEqual({ data: {}, body: text });
  });
});
