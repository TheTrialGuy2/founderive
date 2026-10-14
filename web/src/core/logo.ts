/**
 * Pure logo constants shared by the server-side store (`store/logo.ts`, which also sniffs magic bytes) and the
 * client-side pre-submit size check (`SetupStep`, `LogoRow`). Kept isomorphic — no `node:fs` — so client components
 * can import it directly.
 */
export const LOGO_MAX_BYTES = 1_000_000;
export const LOGO_TOO_BIG_MESSAGE = `Logos can be up to ${LOGO_MAX_BYTES.toLocaleString()} bytes (about 1 MB). Try a smaller file.`;

/** Whether a chosen file is too big to even try uploading, checked before a submit that would otherwise crash. */
export function isLogoTooBig(sizeInBytes: number): boolean {
  return sizeInBytes > LOGO_MAX_BYTES;
}
