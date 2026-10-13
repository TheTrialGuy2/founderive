export function localISODate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The founder's "today": founder.md can pin a date (useful for demos and tests); otherwise the local date. */
export function resolveToday(override?: string | null): string {
  return override ?? localISODate();
}
