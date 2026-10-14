import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, formatDate, PageHeader } from "@/components/ui";
import { BlockForm } from "@/components/canvas/BlockForm";
import { AskClaude } from "@/components/path/AskClaude";
import { MarkDone } from "@/components/path/MarkDone";
import { PlannedList } from "@/components/path/PlannedList";
import { StepAction } from "@/components/path/StepAction";
import { ActionButton } from "@/components/today/ActionButton";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { buttonPrimary } from "@/components/workbook/form";
import { confirmImportedAction } from "@/app/(workbook)/canvas/actions";
import { loadCanvasBlock } from "@/commands/canvas";
import { loadStep } from "@/commands/step";
import { CONVERSATION_STEP } from "@/core/home";
import { addDays } from "@/core/week";
import { STATUS_LABELS } from "@/lib/loop-labels";

export default function StepPage({ params }: PageProps<"/path/[id]">) {
  return (
    <Suspense fallback={<PageHeader eyebrow="Your path" title="Loading…" />}>
      {params.then(({ id }) => (
        <StepContent id={id} />
      ))}
    </Suspense>
  );
}

/** Only the Customer step is about conversations, so only it says when nobody has discussed it yet. */
const chip = (discussed: number, tested: boolean, conversations: boolean) =>
  tested ? "Tested · supported" : discussed > 0 ? `${discussed} ${discussed === 1 ? "person" : "people"} discussed this` : conversations ? "Your guess · not discussed yet" : "Your guess";

async function StepContent({ id }: { id: string }) {
  await connection();
  const view = await loadStep(id);
  if (view.status !== "ready") {
    if (view.status === "setup") redirect("/setup");
    return (
      <>
        <PageHeader eyebrow="Your path" title="No such step" />
        <p className="text-sm text-muted">
          &quot;{id}&quot; isn&apos;t a step on your path.{" "}
          <Link href="/today" className="font-medium text-teal-dark hover:text-navy">
            Back to Home
          </Link>
        </p>
      </>
    );
  }
  const { step, index, total, nextStep, weekId, today, people, planned, tests } = view;
  const block = await loadCanvasBlock(id);
  const tomorrow = addDays(today, 1);
  const history = block.status === "ready" ? [...(block.block?.history ?? [])].reverse() : [];
  // Conversations are planned and logged on the Customer step only. Every other step's one main action is about the
  // answer: write it while it's empty, then mark the step done (no main action once it's done).
  const conversations = id === CONVERSATION_STEP;
  const answered = block.status === "ready" && !!block.block?.text?.trim();
  const writeIsMain = !conversations && !answered && !step.done;
  const doneIsMain = !conversations && answered && !step.done;

  return (
    <>
      <Link href="/today" className="text-sm text-teal-dark hover:text-navy">
        ← Your path · Step {index} of {total}
      </Link>
      <PageHeader title={step.title}>
        {step.meaning} <span className="block text-sm">You&apos;re done when: {step.doneWhen}</span>
      </PageHeader>

      <section aria-labelledby="answer-heading">
        <h2 id="answer-heading" className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
          Your answer
        </h2>
        {block.status === "ready" && block.flagged ? (
          <FlaggedFile path={block.flagged.path} error={block.flagged.error} />
        ) : (
          <div className="mt-2 rounded-xl border border-line bg-paper p-4">
            {block.status === "ready" && block.block?.seeded && (
              <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                <Badge tone="warn">Imported — confirm</Badge>
                <ActionButton action={confirmImportedAction} fields={{ id }} label="Confirm imported text" variant="quiet" />
              </div>
            )}
            <p className="whitespace-pre-wrap text-ink">{(block.status === "ready" && block.block?.text) || "Nothing written yet. A rough guess is fine."}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted">{chip(step.discussed, step.tested, conversations)}</span>
              <details className="w-full text-sm">
                <summary className={writeIsMain ? `${buttonPrimary} cursor-pointer list-none` : "cursor-pointer text-teal-dark"}>{answered ? "Edit" : "Write your answer"}</summary>
                <div className="mt-3">
                  <BlockForm
                    id={id}
                    initial={{ text: block.status === "ready" ? (block.block?.text ?? "") : "", status: block.status === "ready" ? (block.block?.status ?? "untested") : "untested", notes: block.status === "ready" ? block.notes : "" }}
                    primary={false}
                  />
                </div>
              </details>
            </div>
          </div>
        )}
      </section>

      {(conversations || people.length > 0) && (
        <section aria-labelledby="people-heading" className="mt-10">
          <h2 id="people-heading" className="font-semibold text-navy">
            People who discussed it · {people.length}
          </h2>
          {people.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nobody yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {people.map((p) => (
                <li key={p.slug}>
                  <Link href={`/conversations/${p.slug}`} className="block rounded-xl border border-line bg-paper p-4 hover:border-teal-dark">
                    <span className="font-medium text-navy">{p.person}</span>{" "}
                    <span className="text-sm text-muted">
                      · {p.role} · {p.date ? formatDate(p.date) : "date unknown"}
                    </span>
                    {p.line && <span className="mt-1 block text-sm text-ink italic">&ldquo;{p.line}&rdquo;</span>}
                    {p.changed && <span className="mt-1 block text-sm text-ink">What it changed: {p.changed}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">Customer and prospect conversations with notes, a quote or a number count here.</p>
          {conversations && (
            <>
              <PlannedList planned={planned} weekId={weekId} today={today} />
              <StepAction step={step} weekId={weekId} tomorrow={tomorrow} plan={planned[0] ? `${planned[0].week}:${planned[0].id}` : null} />
              <p className="mt-3 text-sm text-muted">Or tell Claude: &quot;I talked to someone about {step.title.toLowerCase()}&quot;, and it logs it here.</p>
            </>
          )}
        </section>
      )}
      <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
        {conversations ? "Or talk it through:" : "Talk it through:"} <AskClaude title={step.title} />
      </p>

      <details className="mt-10 text-sm">
        <summary className="cursor-pointer font-semibold text-navy">Tests · {tests.length}</summary>
        <ul className="mt-2 space-y-1">
          {tests.map((t) => (
            <li key={t.slug}>
              <Link href={`/tests/${t.slug}`} className="font-medium text-teal-dark hover:text-navy">
                {t.title}
              </Link>{" "}
              <span className="text-muted">· {STATUS_LABELS[t.status]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-muted">
          Need proof, not just talk?{" "}
          <Link href={`/tests/new?step=${id}`} className="font-medium text-teal-dark hover:text-navy">
            Run a small test
          </Link>
        </p>
      </details>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-navy">Earlier versions · {history.length}</summary>
        <ol className="mt-2 space-y-2">
          {history.map((h, i) => (
            <li key={`${h.date}-${i}`} className="rounded-lg border border-line bg-paper p-3">
              <p className="text-xs font-medium text-muted">Until {formatDate(h.date)}</p>
              <p className="mt-1 whitespace-pre-wrap text-ink">{h.text}</p>
            </li>
          ))}
        </ol>
      </details>

      <footer className="mt-12 border-t border-line pt-6">
        <MarkDone step={step} nextStep={nextStep} primary={doneIsMain} />
      </footer>
    </>
  );
}
