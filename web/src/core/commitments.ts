/** A repeating commitment is a schedule definition, not work the founder can complete or drop. */
export function isCommitmentInstance<T extends { repeat?: unknown }>(commitment: T): boolean {
  return !commitment.repeat;
}
