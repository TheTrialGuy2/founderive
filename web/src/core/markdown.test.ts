import { describe, expect, it } from "vitest";
import { bodySections, getSection, setSection } from "./markdown";

const BODY = "## Evidence\n\n## What we learned\n\n## Decision and why\n";

describe("Markdown sections", () => {
  it("fills a section and leaves the others alone", () =>
    expect(setSection(BODY, "What we learned", "Owners want it")).toBe("## Evidence\n\n## What we learned\n\nOwners want it\n\n## Decision and why\n"));
  it("replaces earlier content", () => {
    const once = setSection(BODY, "Evidence", "One yes");
    expect(getSection(setSection(once, "Evidence", "Two yeses"), "Evidence")).toBe("Two yeses");
  });
  it("fills the last section", () => expect(setSection(BODY, "Decision and why", "Revise")).toBe("## Evidence\n\n## What we learned\n\n## Decision and why\n\nRevise\n"));
  it("appends a missing section", () => expect(setSection("Loose notes.\n", "Evidence", "One yes")).toBe("Loose notes.\n\n## Evidence\n\nOne yes\n"));
  it("reads a section, empty when absent", () => {
    expect(getSection(setSection(BODY, "Decision and why", "**Revise.** Price"), "Decision and why")).toBe("**Revise.** Price");
    expect(getSection("", "Evidence")).toBe("");
  });
});

describe("bodySections", () => {
  it("splits preamble plus three headings", () => {
    const body = "Some preamble.\n\n## First\n\nFirst text\n\n## Second\n\nSecond text\n\n## Third\n\nThird text\n";
    expect(bodySections(body)).toEqual([
      { heading: null, text: "Some preamble." },
      { heading: "First", text: "First text" },
      { heading: "Second", text: "Second text" },
      { heading: "Third", text: "Third text" },
    ]);
  });

  it("returns an empty array for an empty body", () => expect(bodySections("")).toEqual([]));

  it("drops a heading with nothing under it", () => {
    const body = "## First\n\nFirst text\n\n## Empty\n\n## Third\n\nThird text\n";
    expect(bodySections(body)).toEqual([
      { heading: "First", text: "First text" },
      { heading: "Third", text: "Third text" },
    ]);
  });

  it("keeps ### sub-headings inside the enclosing section's text", () => {
    const body = "## First\n\n### Sub heading\n\nmore text\n";
    expect(bodySections(body)).toEqual([{ heading: "First", text: "### Sub heading\n\nmore text" }]);
  });
});
