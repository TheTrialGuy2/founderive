const DAY_MS = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((utc(toISO) - utc(fromISO)) / DAY_MS);
}

/** Which program week "today" falls in: an explicit override wins, otherwise counted from the start date. */
export function currentWeek(opts: { programStart?: string | null; today: string; totalWeeks: number; override?: number | null }): number | null {
  if (opts.override) return Math.min(Math.max(opts.override, 1), opts.totalWeeks);
  if (!opts.programStart) return null;
  const days = daysBetween(opts.programStart, opts.today);
  if (days < 0) return null;
  return Math.min(Math.floor(days / 7) + 1, opts.totalWeeks);
}

export function weekDate(programStart: string, week: number): string {
  return new Date(utc(programStart) + (week - 1) * 7 * DAY_MS).toISOString().slice(0, 10);
}

export function weekFile(week: number): string {
  return `program/week-${String(week).padStart(2, "0")}.md`;
}
