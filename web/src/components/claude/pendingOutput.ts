/** About the size of the terminal server's scrollback ring buffer; nothing older than that can be replayed anyway. */
export const PENDING_OUTPUT_MAX = 200 * 1024;

/** Appends terminal output to a buffer kept until the terminal view exists, keeping only the last `max` characters. */
export function appendCapped(buffer: string, data: string, max = PENDING_OUTPUT_MAX): string {
  const next = buffer + data;
  return next.length > max ? next.slice(next.length - max) : next;
}
