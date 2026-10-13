/**
 * The fields Today's Done and Drop actions send for a commitment. A commitment carried from an earlier week keeps its
 * own week, so setCommitmentStatus writes to the check-in file it lives in; one made this week uses this week.
 */
export function commitmentFields(item: { id: string; week?: string }, weekId: string, status: "done" | "dropped"): { week: string; id: string; status: string } {
  return { week: item.week ?? weekId, id: item.id, status };
}
