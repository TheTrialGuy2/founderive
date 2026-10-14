/** Matches a URI scheme at the start of a string (e.g. "https:", "mailto:"), per RFC 3986 §3.1. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * The safe, clickable form of a founder's website, or null when there isn't one, or it doesn't resolve to an
 * http(s) address. A bare domain such as "www.lantern.app" is treated as https; anything else — a non-http(s)
 * scheme, or text that still isn't a URL — returns null so the page can fall back to plain text instead of a link.
 */
export function websiteHref(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? candidate : null;
  } catch {
    return null;
  }
}
