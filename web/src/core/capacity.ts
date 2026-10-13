import type { Commitment } from "../store/schemas";

/** Rough hours one open commitment takes. Deliberately simple, so a founder can see and argue with the rule. */
export const HOURS_PER_COMMITMENT = 3;

/** Hours assumed from the founder's commitment level when they didn't give hours per week. */
export const DEFAULT_HOURS: Record<Commitment, number> = { "full-time": 40, "part-time": 20, "nights-weekends": 10 };

/**
 * One plain line when this week's open commitments plainly exceed the founder's time (spec §0, capacity-aware Today).
 * Each open commitment counts as about 3 hours, compared with hoursPerWeek or, without it, the commitment level's
 * default. Null when the work fits, or when the founder hasn't said how much time they have.
 */
export function capacityWarning(hoursPerWeek: number | null | undefined, commitment: Commitment | null | undefined, openCommitmentsCount: number): string | null {
  const hours = hoursPerWeek ?? (commitment ? DEFAULT_HOURS[commitment] : null);
  if (hours == null) return null;
  const needed = openCommitmentsCount * HOURS_PER_COMMITMENT;
  if (needed <= hours) return null;
  const noun = openCommitmentsCount === 1 ? "open commitment needs" : "open commitments need";
  return `Your ${openCommitmentsCount} ${noun} about ${needed} hours, and you have about ${hours} this week. Finish or drop one before adding more.`;
}
