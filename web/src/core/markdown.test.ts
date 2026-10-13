import { describe, expect, it } from "vitest";
import { getSection, setSection } from "./markdown";

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
