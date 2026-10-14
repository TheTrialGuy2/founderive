import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, formatDate, PageHeader } from "@/components/ui";
import { CopyPrompt } from "@/components/workbook/CopyPrompt";
import { EmptyState } from "@/components/workbook/EmptyState";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { buttonPrimary } from "@/components/workbook/form";
import { ActionButton } from "@/components/today/ActionButton";
import { confirmImportedRecordAction } from "@/app/(workbook)/import/actions";
import { loadPromptContext } from "@/commands/today";
import { loadTests, type TestRow } from "@/commands/venture-tests";
import { fillPrompt, SKILL_PROMPTS } from "@/lib/prompts";
import { areaLabel, DECISION_LABELS, RESULT_LABELS, STATUS_LABELS, STRENGTH_LABELS } from "@/lib/loop-labels";

export default function TestsPage() {
  return (
    <>
      <PageHeader title="Tests">Each test checks one belief with a small, real action. Its thresholds are set before the results come in.</PageHeader>
      <Suspense fallback={null}>
        <TestsContent />
      </Suspense>
    </>
  );
}

async function TestsContent() {
  await connection();
  const [{ running, planned, closed, flagged }, promptVars] = await Promise.all([loadTests(), loadPromptContext()]);
  const empty = running.length + planned.length + closed.length === 0;
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
      {empty ? (
        <EmptyState title="No tests yet" detail="Pick the belief most likely to sink the business, and a quick way to find out if it's wrong.">
          <Link href="/tests/new" className={`${buttonPrimary} mt-4`}>
            Design a test
          </Link>
          <CopyPrompt prompts={{ fileChat: fillPrompt(SKILL_PROMPTS.tests, promptVars) }} />
        </EmptyState>
      ) : (
        <>
          <div className="mb-8">
            <Link href="/tests/new" className={buttonPrimary}>
              Design a test
            </Link>
          </div>
          <TestSection id="running" title="Running" rows={running} empty="Nothing running. Start a planned test or design a new one." />
          <TestSection id="planned" title="Planned" rows={planned} empty="Nothing planned." />
          <TestSection id="complete" title="Complete" rows={closed} empty="No completed tests yet." />
        </>
      )}
    </>
  );
}

function TestSection({ id, title, rows, empty }: { id: string; title: string; rows: TestRow[]; empty: string }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="mb-10">
      <h2 id={`${id}-heading`} className="font-semibold text-navy">
        {title} · {rows.length}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.path} className="rounded-lg border border-line bg-paper hover:border-teal-dark">
              <Link href={`/tests/${r.slug}`} className="block p-4">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-navy">{r.data.title}</span>
                  <Badge tone={r.data.status === "running" ? "info" : "neutral"}>{STATUS_LABELS[r.data.status]}</Badge>
                  <Badge>{areaLabel(r.data.area)}</Badge>
                  {r.data.seeded && <Badge tone="warn">Imported — confirm</Badge>}
                </span>
                <span className="mt-1 block text-sm text-muted">{summary(r)}</span>
              </Link>
              {/* An imported test counts nowhere, and can't be started or finished, until the founder confirms its criteria. */}
              {r.data.seeded && (
                <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2 text-sm text-muted">
                  <span>Check the belief and criteria, then confirm them as yours.</span>
                  <ActionButton action={confirmImportedRecordAction} fields={{ path: r.path }} label="Confirm" ariaLabel={`Confirm ${r.data.title}`} variant="quiet" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function summary(r: TestRow): string {
  const t = r.data;
  if (t.status === "complete" && t.result && t.decision) return `${RESULT_LABELS[t.result]}, then ${DECISION_LABELS[t.decision].toLowerCase()}${t.closedOn ? ` · ${formatDate(t.closedOn)}` : ""}`;
  if (t.status === "abandoned") return `Stopped early: ${t.abandonReason ?? ""}`;
  const n = t.relatedConversations.length;
  return [t.due ? `Due ${formatDate(t.due)}` : "No due date", `${n} linked conversation${n === 1 ? "" : "s"}`, `Evidence: ${STRENGTH_LABELS[t.evidenceStrength]}`].join(" · ");
}
