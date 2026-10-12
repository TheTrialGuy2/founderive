export type Engagement = "active" | "stalled" | "quiet";

const DAY_MS = 86_400_000;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/** Active within a week, stalled within two, quiet after that. */
export function engagementStatus(lastActivity: string, today: string): Engagement {
  const days = daysBetween(lastActivity, today);
  if (days <= 7) return "active";
  if (days <= 13) return "stalled";
  return "quiet";
}
