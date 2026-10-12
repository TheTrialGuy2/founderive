import { describe, expect, it } from "vitest";
import { listPrograms, seed } from "@/data/repo";
import { checkinResponse, cohortRows, cohortStats, outcomeRollup, phaseCounts, pipelineStats, capitalPipeline } from "./operator";

const base = { conversations: seed.conversations, programs: listPrograms(), checkinConfirmed: false, optIns: [] as string[], reportedEdits: {} as Record<string, string> };

describe("operator rollups", () => {
  it("starts at 8 of 10 check-ins responded, 5 verified", () => {
    expect(checkinResponse(cohortRows(base))).toEqual({ responded: 8, verified: 5, total: 10 });
  });

  it("counts Dana once Dana confirms", () => {
    expect(checkinResponse(cohortRows({ ...base, checkinConfirmed: true })).responded).toBe(9);
  });

  it("reports outcomes with responded, verified and total", () => {
    const r = outcomeRollup(base);
    expect(r.responded).toBe(15);
    expect(r.verified).toBe(8);
    expect(r.total).toBe(18);
  });

  it("uses Dana's corrected check-in values, not a second copy", () => {
    const before = outcomeRollup({ ...base, checkinConfirmed: true }).capitalRaised;
    const after = outcomeRollup({ ...base, checkinConfirmed: true, reportedEdits: { capital: "$20,000" } }).capitalRaised;
    expect(after - before).toBe(8000);
  });

  it("derives cohort stats from rows", () => {
    const s = cohortStats(cohortRows(base));
    expect(s.stepsTotal).toBe(21);
    expect(s.needNudge).toBe(4);
  });

  it("counts founders by phase", () => {
    expect(phaseCounts()).toEqual({ idea: 4, early: 10, validation: 3, capital: 1 });
  });

  it("summarizes the pipeline", () => {
    expect(pipelineStats(capitalPipeline(base))).toEqual({ introsMade: 4, invested: 1, optedIn: 1 });
  });
});
