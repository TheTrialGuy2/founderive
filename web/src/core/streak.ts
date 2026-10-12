import { daysBetween } from "./engagement";

/** Monday of the week containing `iso`. */
function weekStart(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** For the last `weeks` weeks (index 0 = this week), whether any date falls in that week. */
export function weekActivity(dates: string[], today: string, weeks: number): boolean[] {
  const current = weekStart(today);
  const active = new Array<boolean>(weeks).fill(false);
  for (const date of dates) {
    const ago = Math.round(daysBetween(weekStart(date), current) / 7);
    if (ago >= 0 && ago < weeks) active[ago] = true;
  }
  return active;
}

/**
 * Consecutive active weeks. Founders don't work daily, so the unit is a week, and the
 * current week only counts once it's done — an empty Monday doesn't break the chain.
 */
export function weekStreak(activity: boolean[]): number {
  let i = activity[0] ? 0 : 1;
  let streak = 0;
  while (i < activity.length && activity[i]) {
    streak++;
    i++;
  }
  return streak;
}
