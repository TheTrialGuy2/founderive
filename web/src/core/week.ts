const DAY_MS = 86_400_000;
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const mondayOffset = (d: Date) => (d.getUTCDay() + 6) % 7;

/** ISO 8601 week id (weeks start Monday; week 1 contains the year's first Thursday). */
export function isoWeekId(iso: string): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() - mondayOffset(d) + 3); // Thursday of this week
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  jan4.setUTCDate(jan4.getUTCDate() - mondayOffset(jan4) + 3);
  const week = 1 + Math.round((d.getTime() - jan4.getTime()) / (7 * DAY_MS));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** The Monday of the week containing this date. */
export function weekStart(iso: string): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() - mondayOffset(d));
  return d.toISOString().slice(0, 10);
}

/** The date `days` after this one (negative goes back). */
export function addDays(iso: string, days: number): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
