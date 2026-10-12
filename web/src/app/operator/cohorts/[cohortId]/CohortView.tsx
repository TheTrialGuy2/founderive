"use client";

import Link from "next/link";
import { TODAY } from "@/config";
import { Badge, PageHeader, Stat, formatDate } from "@/components/ui";
import { daysBetween, engagementStatus } from "@/core/engagement";
import { getCohortName } from "@/data/repo";
import { useDemo } from "@/state/DemoStore";
import { sessionLabel } from "@/state/derived";
import { COHORT_WEEKS, checkinResponse, cohortRows, cohortStats } from "@/state/operator";

const ENGAGEMENT_TONE = { active: "good", stalled: "warn", quiet: "bad" } as const;
const HALFWAY = { on_track: ["On track", "good"], behind: ["Behind", "bad"], not_started: ["—", "neutral"] } as const;
const CHECKIN = { verified: ["Verified", "good"], confirmed: ["Confirmed", "info"], pending: ["Pending", "warn"] } as const;

export function CohortView({ cohortId }: { cohortId: string }) {
  const state = useDemo();
  const rows = cohortRows(state);
  const checkin = checkinResponse(rows);
  const stats = cohortStats(rows);
  const next = sessionLabel(state.programs.find((p) => p.id === "esc")!);
  // Oldest week on the left; week 1 is Session 1.
  const weekLabels = Array.from({ length: COHORT_WEEKS }, (_, i) => `W${i + 1}`);

  return (
    <>
      <PageHeader eyebrow={`Cohort pulse · Session ${next.n} of ${next.of} on ${formatDate(next.date)}`} title={getCohortName(cohortId)} />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Homework done" value={`${stats.avgDonePct}%`} />
        <Stat label="Need a nudge" value={stats.needNudge} />
        <Stat label="Halfway check-in" value={`${checkin.responded}/${checkin.total}`} sub={`${checkin.verified} verified`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-paper">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Founder</th>
              {weekLabels.map((w) => (
                <th key={w} className="w-10 px-1 py-3 text-center font-medium">
                  {w}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Halfway</th>
              <th className="px-4 py-3 font-medium">Check-in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = engagementStatus(r.lastActivity, TODAY);
              const [hLabel, hTone] = HALFWAY[r.halfway];
              const [cLabel, cTone] = CHECKIN[r.checkin];
              const oldestFirst = [...r.activeWeeks].reverse();
              return (
                <tr key={r.founderId} className="border-t border-line">
                  <td className="px-4 py-2.5">
                    <Link href={`/operator/founders/${r.founderId}`} className="font-medium text-navy hover:underline">
                      {r.name}
                    </Link>
                    <span className="ml-2 text-xs text-muted">{r.venture}</span>
                  </td>
                  {oldestFirst.map((on, i) => {
                    const isCurrent = i === oldestFirst.length - 1;
                    return (
                      <td key={i} className="px-1 py-2.5">
                        <span
                          className={`mx-auto block h-6 w-6 rounded-md ${on ? "bg-lime" : isCurrent ? "border-2 border-dashed border-line" : "bg-sand"}`}
                          title={on ? "Active" : isCurrent ? "This week" : "No activity"}
                        />
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5">
                    <Badge tone={ENGAGEMENT_TONE[status]}>{status === "active" ? "active" : `${status} · ${daysBetween(r.lastActivity, TODAY)}d`}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={hTone}>{hLabel}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={cTone}>{cLabel}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
