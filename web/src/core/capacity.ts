import type { Commitment } from "../store/schemas";

/** Rough hours one open commitment takes. Deliberately simple, so a founder can see and argue with the rule. */
export const HOURS_PER_COMMITMENT = 3;

/** Hours assumed from the founder's commitment level when they didn't give hours per week. */
export const DEFAULT_HOURS: Record<Commitment, number> = { "full-time": 40, "part-time": 20, "nights-weekends": 10 };

/** How each commitment level reads in a sentence, in place of its internal id. */
const COMMITMENT_LABELS: Record<Commitment, string> = { "full-time": "full-time", "part-time": "part-time", "nights-weekends": "nights-and-weekends" };

/**
 * One plain line when this week's open commitments plainly exceed the founder's time (spec §0, capacity-aware Today).
 * The threshold is internal only: each open commitment counts as about 3 hours, compared with hoursPerWeek or,
 * without it, the commitment level's default. The line itself states only known facts and asks a question — it
 * never names the internal hour estimate and never tells the founder what to do (spec §3.4); that's the founder's
 * call. Null when the work fits, or when the founder hasn't said how much time they have.
 */
export function capacityWarning(hoursPerWeek: number | null | undefined, commitment: Commitment | null | undefined, openCommitmentsCount: number): string | null {
  const hours = hoursPerWeek ?? (commitment ? DEFAULT_HOURS[commitment] : null);
  if (hours == null) return null;
  const needed = openCommitmentsCount * HOURS_PER_COMMITMENT;
  if (needed <= hours) return null;
  const noun = openCommitmentsCount === 1 ? "open item" : "open items";
  const against = hoursPerWeek != null ? `the ${hoursPerWeek} hours you said you have` : `your ${COMMITMENT_LABELS[commitment as Commitment]} schedule`;
  return `${openCommitmentsCount} ${noun} this week against ${against}. Does that fit?`;
}
