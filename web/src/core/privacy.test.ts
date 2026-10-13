import { describe, expect, it } from "vitest";
import { CONTACT_SAMPLES } from "../commands/test-inputs";
import { CONTACT_DETAILS_MESSAGE, looksLikeContactDetails } from "./privacy";

describe("looksLikeContactDetails", () => {
  it.each(Object.entries(CONTACT_SAMPLES))("catches %s", (_kind, value) => expect(looksLikeContactDetails(value)).toBe(true));
  it("lets names and roles through, including ones with a period", () => {
    for (const v of ["Dana", "Dr. Lee", "agency owner", "St. Louis buyer", "Owner of 3 agencies"]) expect(looksLikeContactDetails(v)).toBe(false);
  });
  it("says what to use instead", () => expect(CONTACT_DETAILS_MESSAGE).toMatch(/first name or a role/));
});
