"use client";

import { useState } from "react";
import { ORG_NAME } from "@/config";
import { Badge, Card, PageHeader, formatDate } from "@/components/ui";
import { PHASES, getFounder, listFounders, seed } from "@/data/repo";
import type { IntroStage } from "@/data/types";
import { useDemo } from "@/state/DemoStore";
import { capitalPipeline, checkinResponse, cohortRows, engagementCounts, outcomeRollup, phaseCounts, pipelineStats } from "@/state/operator";

const STAGES: { key: IntroStage; label: string }[] = [
  { key: "opted_in", label: "Ready & opted in" },
  { key: "requested", label: "Intro requested" },
  { key: "made", label: "Intro made" },
  { key: "meeting", label: "Meeting" },
  { key: "invested", label: "Invested" },
  { key: "passed", label: "Passed" },
];

type Row = { label: string; value: string; note: string };
type Template = "Ecosystem grant (foundation)" | "City economic development" | "Board quarterly";
const TEMPLATES: Template[] = ["Ecosystem grant (foundation)", "City economic development", "Board quarterly"];

export default function OperatorCapitalPage() {
  const state = useDemo();
  const [template, setTemplate] = useState<Template>(TEMPLATES[0]);
  const pipeline = capitalPipeline(state);
  const pipe = pipelineStats(pipeline);
  const outcomes = outcomeRollup(state);
  const checkin = checkinResponse(cohortRows(state));
  const phases = phaseCounts();
  const engagement = engagementCounts();
  const founders = listFounders();
  const partnerName = (id: string) => seed.capitalPartners.find((p) => p.id === id)?.name ?? id;
  const coverage = `of ${outcomes.responded} reporting (${outcomes.total} total) · ${outcomes.verified} verified`;

  const rows: Record<Template, Row[]> = {
    "Ecosystem grant (foundation)": [
      { label: "Founders served", value: String(founders.length), note: PHASES.map((p) => `${p.label} ${phases[p.key]}`).join(" · ") },
      { label: "Founders with paying customers", value: String(outcomes.withPayingCustomers), note: coverage },
      { label: "Capital raised by founders", value: `$${outcomes.capitalRaised.toLocaleString()}`, note: coverage },
      { label: "Cohort halfway check-in", value: `${checkin.responded} of ${checkin.total}`, note: `${checkin.verified} document-verified` },
    ],
    "City economic development": [
      { label: "Businesses served", value: String(founders.length), note: "All Charlotte-based in this demo" },
      { label: "Jobs (founders + hires)", value: String(outcomes.jobs), note: coverage },
      { label: "Businesses with revenue", value: String(outcomes.withPayingCustomers), note: coverage },
      { label: "Capital accessed", value: `$${outcomes.capitalRaised.toLocaleString()}`, note: coverage },
    ],
    "Board quarterly": [
      { label: "Active founders this week", value: String(engagement.active), note: `${engagement.stalled} stalled · ${engagement.quiet} quiet` },
      { label: "Capital introductions made", value: String(pipe.introsMade), note: `${pipe.invested} resulted in investment` },
      { label: "Founders ready & opted in", value: String(pipe.optedIn), note: "Waiting for an introduction" },
      { label: "Cohort halfway check-in", value: `${checkin.responded} of ${checkin.total}`, note: `${checkin.verified} document-verified` },
    ],
  };

  return (
    <>
      <PageHeader eyebrow="Capital & reports" title="Capital pipeline" />

      <div className="mb-8 grid gap-3 overflow-x-auto md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((stage) => {
          const items = pipeline.filter((i) => i.stage === stage.key);
          return (
            <div key={stage.key} className="min-w-40 rounded-xl border border-line bg-paper p-3">
              <p className="text-xs font-medium text-muted">
                {stage.label} · {items.length}
              </p>
              <ul className="mt-2 space-y-2">
                {items.map((i) => {
                  const f = getFounder(i.founderId)!;
                  return (
                    <li key={i.id} className="rounded-lg bg-canvas p-2 text-xs">
                      <p className="font-medium text-navy">{f.ventureName}</p>
                      <p className="text-muted">→ {partnerName(i.partnerId)}</p>
                      <p className="text-muted">{formatDate(i.updatedAt)}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <Card
        title="Funder report"
        action={
          <select value={template} onChange={(e) => setTemplate(e.target.value as Template)} className="rounded border border-line bg-paper px-2 py-1 text-sm">
            {TEMPLATES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        }
      >
        <div className="rounded-lg border border-line bg-canvas p-5 text-sm">
          <p className="font-serif text-lg text-navy">
            {ORG_NAME}: {template}
          </p>
          <p className="text-xs text-muted">Period: Jul 1 to Oct 12, 2026 · from founder-confirmed records</p>
          <table className="mt-4 w-full">
            <tbody className="divide-y divide-line">
              {rows[template].map((r) => (
                <tr key={r.label}>
                  <td className="py-2">{r.label}</td>
                  <td className="py-2 text-right font-medium">{r.value}</td>
                  <td className="py-2 pl-4 text-xs text-muted">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Badge tone="neutral">Export PDF / CSV in the full build</Badge>
        </div>
      </Card>
    </>
  );
}
