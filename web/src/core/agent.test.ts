import { describe, expect, it } from "vitest";
import { draftWriteup } from "./agent";

describe("draftWriteup", () => {
  it("drafts the agency-owner call with a contamination flag", () => {
    const draft = draftWriteup("Call with an agency owner about pricing");
    expect(draft.type).toBe("customer_discovery");
    expect(draft.contaminationFlags.length).toBeGreaterThan(0);
    expect(draft.quotes.length).toBeGreaterThan(0);
  });

  it("falls back to a generic draft that still has every section", () => {
    const draft = draftWriteup("Coffee with a friend");
    expect(draft.newFact).not.toBe("");
    expect(draft.whatThisChanges).toEqual([]);
  });
});
