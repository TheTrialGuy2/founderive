import { describe, expect, it } from "vitest";
import { CONTACT_SAMPLES } from "../commands/test-inputs";
import { CONTACT_DETAILS_MESSAGE, looksLikeContactDetails } from "./privacy";

describe("looksLikeContactDetails", () => {
  it.each(Object.entries(CONTACT_SAMPLES))("catches %s", (_kind, value) => expect(looksLikeContactDetails(value)).toBe(true));
  it("lets names and roles through, including ones with a period", () => {
    for (const v of ["Dana", "Dr. Lee", "agency owner", "St. Louis buyer", "Owner of 3 agencies", "Sam (CO.STARTERS mentor)", "Node.js mentor", "U.S. Bank buyer"]) {
      expect(looksLikeContactDetails(v)).toBe(false);
    }
  });
  it("still catches email, explicit web addresses, common bare hosts and phone numbers", () => {
    for (const v of ["dana@example.com", "www.example.com", "example.com", "lantern.work", "lantern.app", "linktr.ee/dana", "dana.co.uk", "dana.ca", "bit.ly/x", "dana.xyz", "bsky.social", "704-555-0100"]) {
      expect(looksLikeContactDetails(v)).toBe(true);
    }
  });
  it("says what to use instead", () => expect(CONTACT_DETAILS_MESSAGE).toMatch(/first name or a role/));
});
