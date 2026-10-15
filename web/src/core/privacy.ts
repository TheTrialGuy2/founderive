// What a founder's records must never hold. Pure, with no imports, so the store's schemas, the commands and the
// paste parsers all share it.

/** What to say when a conversation's person holds contact details. */
export const CONTACT_DETAILS_MESSAGE = "Use a first name or a role, like Dana or agency owner, not an email, web address or phone number.";

/**
 * An email, a web address or a phone number anywhere in the value. A conversation's person is a first name or a role.
 * Web: "://", "www.", or a bare host-shaped token. A tiny exception set covers dotted product/community names whose
 * final label is not a public suffix, without allowing real country-code or newer generic domains through. Phone: a
 * run of digits, spaces, dots, dashes and parentheses (with an optional leading +) holding 7 or
 * more digits; an extension after it doesn't matter.
 */
export function looksLikeContactDetails(v: string): boolean {
  if (/\S+@\S+\.\S+/.test(v)) return true;
  if (/:\/\/|\bwww\./i.test(v)) return true;
  if (hasHost(v)) return true;
  return (v.match(/\+?[\d(][\d\s().-]*\d/g) ?? []).some((run) => (run.match(/\d/g)?.length ?? 0) >= 7);
}

const NON_WEB_SUFFIXES = new Set(["js", "starters"]);

/** A token shaped like name.tld or name.tld/path, except known dotted names that are not web addresses. */
function hasHost(v: string): boolean {
  return v.split(/\s+/).some((token) => {
    const match = /^[(<]?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.([a-z]{2,24})(?:[/:?#][^\s]*)?[)>.,;]?$/i.exec(token);
    return !!match && !NON_WEB_SUFFIXES.has(match[1].toLowerCase());
  });
}
