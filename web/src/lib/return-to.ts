import { BLOCK_ID_PATTERN } from "../store/schemas";

/** Where a form may send the founder after saving: only a path step page (/path/<step id>), never an outside address. */
export function safeReturnTo(value: string): string | null {
  const m = /^\/path\/([^/]+)$/.exec(value);
  return m && BLOCK_ID_PATTERN.test(m[1]) ? value : null;
}
