"use client";

import Link from "next/link";
import { ORG_NAME, TODAY } from "@/config";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { daysBetween, engagementStatus } from "@/core/engagement";
import { PHASES, getCohortName, listFounders } from "@/data/repo";
import { useDemo } from "@/state/DemoStore";
import { checkinResponse, cohortRows, engagementCounts, outcomeRollup, phaseCounts } from "@/state/operator";

export default function OverviewPage() {
  const state = useDemo();
  const founders = listFounders();
  const engagement = engagementCounts();
  const outcomes = outcomeRollup(state);
  const checkin = checkinResponse(cohortRows(state));
  const quiet = founders.filter((f) => engagementStatus(f.lastActivity, TODAY) === "quiet");
  const phases = phaseCounts();
  const maxPhase = Math.max(...Object.values(phases));
  const coverage = `${outcomes.responded} of ${outcomes.total} reporting · ${outcomes.verified} verified`;

  return (
    <>
      <PageHeader eyebrow={ORG_NAME} title="Ecosystem overview" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Founders in the ecosystem" value={founders.length}  />
        <Stat label="Active this week" value={engagement.active} sub={`${engagement.stalled} stalled · ${engagement.quiet} quiet`} />
        <Stat
          label="Capital raised"
          value={`$${Math.round(outcomes.capitalRaised / 1000)}K`}
          sub={coverage}
        />
        <Stat
          label="Founders with paying customers"
          value={outcomes.withPayingCustomers}
          sub={`${outcomes.payingCustomers} customers · ${outcomes.jobs} jobs · ${coverage}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Founders by phase" className="lg:col-span-2">
          <ul className="space-y-3">
            {PHASES.map((p) => {
              const n = phases[p.key];
              return (
                <li key={p.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{p.label}</span>
                    <span className="font-medium">{n}</span>
                  </div>
                  <div className="h-6 rounded bg-sand">
                    <div className="h-full rounded bg-navy" style={{ width: `${(n / maxPhase) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/operator/cohorts/esc-fall-26" className="text-navy underline">
              {getCohortName("esc-fall-26")}
            </Link>{" "}
            <span className="text-muted">
              · halfway check-in: {checkin.responded} of {checkin.total} responded · {checkin.verified} verified
            </span>
          </p>
        </Card>

        <Card title="Nudge these founders">
          <ul className="space-y-2 text-sm">
            {quiet.map((f) => (
              <li key={f.id} className="flex justify-between gap-2">
                <Link href={`/operator/founders/${f.id}`} className="text-navy underline">
                  {f.name} · {f.ventureName}
                </Link>
                <Badge tone="bad">{daysBetween(f.lastActivity, TODAY)}d</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
