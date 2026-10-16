import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, Card, formatDate, PageHeader } from "@/components/ui";
import { DecisionForm } from "@/components/decisions/DecisionForm";
import { ResolveDecisionForm } from "@/components/decisions/ResolveDecisionForm";
import { OutcomeForm } from "@/components/decisions/OutcomeForm";
import { BrokenLinks } from "@/components/workbook/BrokenLinks";
import { SeededNote } from "@/components/workbook/SeededNote";
import { CopyPrompt } from "@/components/workbook/CopyPrompt";
import { EmptyState } from "@/components/workbook/EmptyState";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { Pagination } from "@/components/workbook/Pagination";
import { loadDecisions, type DecisionRow } from "@/commands/decisions";
import { loadFounderToday, loadPromptContext } from "@/commands/today";
import { bodySections } from "@/core/markdown";
import { hrefFor } from "@/core/slug";
import { AREA_LABELS } from "@/lib/loop-labels";
import { fillPrompt, SKILL_PROMPTS } from "@/lib/prompts";
import { pageHref, pageNumber, paginate } from "@/lib/pagination";

export default function DecisionsPage({ searchParams }: PageProps<"/decisions">) {
  return (
    <>
      <PageHeader title="Decisions">Open questions and calls you made outside a test, with the reasoning kept. A test&apos;s own decision stays on the test.</PageHeader>
      <Suspense fallback={null}>
        {searchParams.then((sp) => (
          <DecisionsContent requestedPage={pageNumber(sp.page)} />
        ))}
      </Suspense>
    </>
  );
}

async function DecisionsContent({ requestedPage }: { requestedPage: number }) {
  await connection();
  const [{ rows, flagged, evidenceOptions, tests }, today, promptVars] = await Promise.all([loadDecisions(), loadFounderToday(), loadPromptContext()]);
  const labels = new Map(evidenceOptions.map((o) => [o.path, o.label]));
  const paged = paginate(rows, requestedPage);
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
        <EmptyState title="No questions or decisions logged yet" detail="Park an open question or record a call that changes direction using the form below.">
          <CopyPrompt prompts={{ fileChat: fillPrompt(SKILL_PROMPTS.decisions, promptVars) }} />
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {paged.items.map((r) => (
            <li key={r.path}>
              <DecisionCard row={r} labels={labels} today={today} />
            </li>
          ))}
        </ul>
      )}
      <Pagination {...paged} itemLabel="decisions" hrefForPage={(page) => pageHref("/decisions", {}, "page", page)} />
      <Card title="Record a question or decision" className="mt-8">
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

/** One of the card's record lists. An empty one isn't rendered, so a decision without evidence against looks as it did. */
function RecordList({ label, paths, labels }: { label: string; paths: string[]; labels: Map<string, string> }) {
  return (
    <div>
      <dt className="font-medium text-ink">{label}</dt>
      <dd>
        <ul className="space-y-1">
          {paths.map((p) => (
            <li key={p}>
              <RecordLink path={p} label={labels.get(p) ?? p} />
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

function DecisionCard({ row, labels, today }: { row: DecisionRow; labels: Map<string, string>; today: string }) {
  const d = row.data;
  // The loop is open once the revisit date has come and nothing has been recorded. The form shows only then.
  const revisitDue = d.status === "decided" && !!d.revisitOn && !d.revisitedOn && d.revisitOn <= today;
  return (
    <article id={row.path.slice(row.path.lastIndexOf("/") + 1, -3)} className="rounded-xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-navy">{d.title}</h2>
        <span className="text-sm text-muted">{formatDate(d.date)}</span>
        {d.area && <Badge>{AREA_LABELS[d.area]}</Badge>}
        {d.status === "open" ? <Badge tone="warn">Open</Badge> : <Badge tone={d.reversible ? "neutral" : "warn"}>{d.reversible ? "Easy to undo" : "Hard to undo"}</Badge>}
        {d.status === "decided" && d.revisitOn && !d.revisitedOn && <span className="text-sm text-muted">Revisit on {formatDate(d.revisitOn)}</span>}
        {d.revisitedOn && <span className="text-sm text-muted">Revisited {formatDate(d.revisitedOn)}</span>}
      </div>
      {/* An imported decision is a draft until the founder confirms it as theirs (amendment §3.4). */}
      {d.seeded && (
        <div className="mt-3">
          <SeededNote path={row.path} source={d.source} />
        </div>
      )}
      {row.broken.length > 0 && (
        <div className="mt-3">
          <BrokenLinks links={row.broken} hint="Fix the path in the decision file. The decision itself is unaffected." />
        </div>
      )}
      <dl className="mt-3 space-y-2 text-sm">
        {d.status === "open" && d.decideBy && (
          <div>
            <dt className="font-medium text-ink">Decide by</dt>
            <dd className="text-ink">{formatDate(d.decideBy)}</dd>
          </div>
        )}
        {d.beliefBefore && (
          <div>
            <dt className="font-medium text-ink">Believed before</dt>
            <dd className="text-muted">{d.beliefBefore}</dd>
          </div>
        )}
        {d.status === "decided" && (
          <>
            <div>
              <dt className="font-medium text-ink">Decided</dt>
              <dd className="text-ink">{d.decision}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Why</dt>
              <dd className="text-muted">{d.why}</dd>
            </div>
          </>
        )}
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
        {/* "Evidence for" only beside an "Against" list, so a decision with nothing against looks as it always did. */}
        {d.evidence.length > 0 && <RecordList label={`${d.against.length > 0 ? "Evidence for" : "Evidence"} · ${d.evidence.length}`} paths={d.evidence} labels={labels} />}
        {d.against.length > 0 && <RecordList label={`Against · ${d.against.length}`} paths={d.against} labels={labels} />}
        {d.relatedTest && (
          <div>
            <dt className="font-medium text-ink">Related test</dt>
            <dd>
              <RecordLink path={d.relatedTest} label={labels.get(d.relatedTest)?.replace(/^Test · /, "") ?? d.relatedTest} />
            </dd>
          </div>
        )}
      </dl>
      {row.notes.trim() && (
        <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
          {bodySections(row.notes).map((s, i) => (
            <div key={i}>
              {s.heading && <h3 className="font-medium text-ink">{s.heading}</h3>}
              <p className="whitespace-pre-wrap text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      )}
      {d.status === "open" && <ResolveDecisionForm path={row.path} />}
      {revisitDue && <OutcomeForm path={row.path} />}
    </article>
  );
}
