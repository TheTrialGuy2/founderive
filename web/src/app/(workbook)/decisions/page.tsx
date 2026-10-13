import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, Card, formatDate, PageHeader } from "@/components/ui";
import { DecisionForm } from "@/components/decisions/DecisionForm";
import { BrokenLinks } from "@/components/workbook/BrokenLinks";
import { CopyPrompt } from "@/components/workbook/CopyPrompt";
import { EmptyState } from "@/components/workbook/EmptyState";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { loadDecisions, type DecisionRow } from "@/commands/decisions";
import { loadFounderToday, loadPromptContext } from "@/commands/today";
import { hrefFor } from "@/core/slug";
import { AREA_LABELS } from "@/lib/loop-labels";
import { fillPrompt, SKILL_PROMPTS } from "@/lib/prompts";

export default function DecisionsPage() {
  return (
    <>
      <PageHeader title="Decisions">Calls you made outside a test, with the reasoning kept. A test&apos;s own decision stays on the test.</PageHeader>
      <Suspense fallback={null}>
        <DecisionsContent />
      </Suspense>
    </>
  );
}

async function DecisionsContent() {
  await connection();
  const [{ rows, flagged, evidenceOptions, tests }, today, promptVars] = await Promise.all([loadDecisions(), loadFounderToday(), loadPromptContext()]);
  const labels = new Map(evidenceOptions.map((o) => [o.path, o.label]));
  return (
    <>
      {flagged.length > 0 && (
        <ul className="mb-6 space-y-2">
          {flagged.map((f) => (
            <li key={f.path}>
              <FlaggedFile path={f.path} error={f.error} />
            </li>
          ))}
        </ul>
      )}
      {rows.length === 0 ? (
        <EmptyState title="No decisions logged yet" detail="When you make a call that changes direction, write down what you believed, what you saw and why, using the form below.">
          <CopyPrompt prompts={{ fileChat: fillPrompt(SKILL_PROMPTS.decisions, promptVars) }} />
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.path}>
              <DecisionCard row={r} labels={labels} />
            </li>
          ))}
        </ul>
      )}
      <Card title="Record a decision" className="mt-8">
        <DecisionForm today={today} evidenceOptions={evidenceOptions} tests={tests} />
      </Card>
    </>
  );
}

function RecordLink({ path, label }: { path: string; label: string }) {
  const href = hrefFor(path);
  return href ? (
    <Link href={href} className="font-medium text-teal-dark hover:text-navy">
      {label}
    </Link>
  ) : (
    <span className="font-mono text-xs">{path}</span>
  );
}

function DecisionCard({ row, labels }: { row: DecisionRow; labels: Map<string, string> }) {
  const d = row.data;
  return (
    <article className="rounded-xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-navy">{d.title}</h2>
        <span className="text-sm text-muted">{formatDate(d.date)}</span>
        {d.area && <Badge>{AREA_LABELS[d.area]}</Badge>}
        <Badge tone={d.reversible ? "neutral" : "warn"}>{d.reversible ? "Easy to undo" : "Hard to undo"}</Badge>
      </div>
      {row.broken.length > 0 && (
        <div className="mt-3">
          <BrokenLinks links={row.broken} hint="Fix the path in the decision file. The decision itself is unaffected." />
        </div>
      )}
      <dl className="mt-3 space-y-2 text-sm">
        {d.beliefBefore && (
          <div>
            <dt className="font-medium text-ink">Believed before</dt>
            <dd className="text-muted">{d.beliefBefore}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-ink">Decided</dt>
          <dd className="text-ink">{d.decision}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink">Why</dt>
          <dd className="text-muted">{d.why}</dd>
        </div>
        {d.alternatives.length > 0 && (
          <div>
            <dt className="font-medium text-ink">Alternatives considered</dt>
            <dd>
              <ul className="list-disc pl-5 text-muted">
                {d.alternatives.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {d.evidence.length > 0 && (
          <div>
            <dt className="font-medium text-ink">Evidence</dt>
            <dd>
              <ul className="space-y-1">
                {d.evidence.map((p) => (
                  <li key={p}>
                    <RecordLink path={p} label={labels.get(p) ?? p} />
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {d.relatedTest && (
          <div>
            <dt className="font-medium text-ink">Related test</dt>
            <dd>
              <RecordLink path={d.relatedTest} label={labels.get(d.relatedTest)?.replace(/^Test · /, "") ?? d.relatedTest} />
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}
