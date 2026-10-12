export type Readiness = "supported" | "partial" | "missing";

/** Whether the record can back a reviewer criterion, from how much evidence links to it. */
export function readinessStatus(required: number, evidenceCount: number): Readiness {
  if (evidenceCount >= required) return "supported";
  if (evidenceCount > 0) return "partial";
  return "missing";
}

/** A founder can share a readiness profile with a partner only once enough criteria are supported. */
export function canShareWith(partner: { minSupported: number }, supportedCount: number): boolean {
  return supportedCount >= partner.minSupported;
}
