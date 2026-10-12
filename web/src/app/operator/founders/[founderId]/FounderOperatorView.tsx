"use client";

import { useRouter } from "next/navigation";
import { CURRENT_FOUNDER_ID, TODAY } from "@/config";
import { Badge, Card, LayerBadge, PageHeader, ProgressBar, formatDate } from "@/components/ui";
import { daysBetween } from "@/core/engagement";
import { Icon } from "@/components/icons";
import { operatorView } from "@/core/visibility";
import { listFounders, phaseLabel } from "@/data/repo";
import { useDemo } from "@/state/DemoStore";
import { currentRecord } from "@/state/derived";
import { fixtureRecord } from "@/state/operator";

export function FounderOperatorView({ founderId }: { founderId: string }) {
  const router = useRouter();
  const state = useDemo();
  const record = founderId === CURRENT_FOUNDER_ID ? currentRecord(state) : fixtureRecord(founderId)!;
  // Rendering goes through the operator view only. In this client-only demo the full record still exists in
  // browser memory; the real build enforces the boundary server-side (RLS + a server-built operator view).
  const view = operatorView(record);
  const { founder } = view;

  return (
    <>
      <div className="mb-4">
        <label className="text-xs text-muted">
          Founder{" "}
          <select
            value={founderId}
            onChange={(e) => router.push(`/operator/founders/${e.target.value}`)}
            className="ml-1 rounded border border-line bg-paper px-2 py-1 text-sm text-ink"
          >
            {listFounders().map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} · {f.ventureName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <PageHeader eyebrow={`${phaseLabel(founder.phase)} · ${founder.city}`} title={`${founder.name} · ${founder.ventureName}`}>
        {founder.oneLiner}
      </PageHeader>

      <p className="mb-5 text-sm text-muted">
        Last active {daysBetween(founder.lastActivity, TODAY) === 0 ? "today" : `${daysBetween(founder.lastActivity, TODAY)} days ago`}. You&apos;re seeing the <LayerBadge layer="program" /> and{" "}
        <LayerBadge layer="reported" /> layers.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Program progress" action={<LayerBadge layer="program" />}>
          <ProgressBar value={view.programProgress.stepsDone} max={view.programProgress.stepsTotal} tone="navy" />
          <p className="mt-2 text-sm">
            {view.programProgress.stepsDone} of {view.programProgress.stepsTotal} Early-Stage Cohort steps done
          </p>
          {view.mentorMeetings.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {view.mentorMeetings.map((m) => (
                <li key={m.id} className="flex justify-between">
                  <span>Mentor meeting · {formatDate(m.date)}</span>
                  <Badge tone={m.status === "held" ? "good" : "neutral"}>{m.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Reported outcomes" action={<LayerBadge layer="reported" />}>
          {view.reported.length === 0 ? (
            <p className="text-sm text-muted">No check-in yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {view.reported.map((r) => (
                <li key={r.key} className="flex justify-between gap-3 py-2">
                  <span className="text-muted">{r.label}</span>
                  <span className="text-right">
                    {r.value}{" "}
                    {r.verification === "document_verified" && <Badge tone="good">verified</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {view.profile.length > 0 && (
          <Card title="Shared profile" className="lg:col-span-2" action={<LayerBadge layer="program" />}>
            <ul className="grid gap-3 text-sm md:grid-cols-2">
              {view.profile.map((p) => (
                <li key={p.key} className="rounded-lg bg-canvas p-3">
                  <p className="text-xs text-muted">{p.question}</p>
                  <p className="mt-1">{p.answer}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Private to the founder" className="lg:col-span-2" action={<LayerBadge layer="private" />}>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {view.lockedSections.map((s) => (
              <div key={s} className="rounded-lg border border-dashed border-line p-3 text-center text-sm text-muted">
                <Icon name="lock" size={16} className="mx-auto" />
                <p className="mt-1">{s}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
