import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, Card, formatDate, PageHeader } from "@/components/ui";
import { LinkForm } from "@/components/loop/LinkForm";
import { AbandonTestForm } from "@/components/tests/AbandonTestForm";
import { CompleteTestForm } from "@/components/tests/CompleteTestForm";
import { EvidenceNotesForm } from "@/components/tests/EvidenceNotesForm";
import { StrengthForm } from "@/components/tests/StrengthForm";
import { ActionButton } from "@/components/today/ActionButton";
import { SeededNote } from "@/components/workbook/SeededNote";
import { BrokenLinks } from "@/components/workbook/BrokenLinks";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { unlinkEvidenceAction } from "@/app/(workbook)/evidence-actions";
import { startTestAction } from "@/app/(workbook)/tests/actions";
import { loadTest } from "@/commands/venture-tests";
import { countsAsEvidence, isCustomerEvidence } from "@/core/conversations";
import { whyFrom } from "@/core/venture-tests";
import { AREA_LABELS, DECISION_LABELS, RESULT_LABELS, STATUS_LABELS, STRENGTH_LABELS, TYPE_LABELS } from "@/lib/loop-labels";

const CLOSED_NOTE = "This test is closed. Add new evidence to the conversation, or start a follow-up test.";

export default function TestPage({ params }: PageProps<"/tests/[slug]">) {
  return (
    <Suspense fallback={<PageHeader eyebrow="Venture test" title="Loading…" />}>
      {params.then(({ slug }) => (
        <TestContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function TestContent({ slug }: { slug: string }) {
  await connection();
  const view = await loadTest(slug);
  if (view.status === "missing") {
    return (
      <>
        <PageHeader eyebrow="Venture test" title="Test not found" />
        <p className="text-sm text-muted">
          There&apos;s no tests/{slug}.md in founder-data. It may have been renamed or archived.{" "}
          <Link href="/tests" className="font-medium text-teal-dark hover:text-navy">
            See all tests
          </Link>
        </p>
      </>
    );
  }
  if (view.status === "flagged") {
    return (
      <>
        <PageHeader eyebrow="Venture test" title="This test can't be read" />
        <FlaggedFile path={view.path} error={view.error} />
      </>
    );
  }

  const t = view.data;
  const open = t.status === "planned" || t.status === "running";
  const linkable = view.conversations.filter((c) => !t.relatedConversations.includes(c.path));
  // An imported conversation the founder hasn't confirmed isn't evidence yet.
  const customerEvidenceCount = view.linked.filter(countsAsEvidence).length;

  return (
    <>
      <PageHeader eyebrow={`Venture test · ${AREA_LABELS[t.area]}`} title={t.title} />
      <p className="-mt-4 mb-6 flex flex-wrap items-center gap-3 text-sm text-muted">
        <Badge tone={t.status === "running" ? "info" : "neutral"}>{STATUS_LABELS[t.status]}</Badge>
        {t.due && <span>Decide by {formatDate(t.due)}</span>}
        {t.startedOn && <span>Started {formatDate(t.startedOn)}</span>}
      </p>

      {t.status === "complete" && t.result && t.decision && (
        <div role="status" className="mb-6 rounded-xl border border-teal/40 bg-aqua/50 p-4">
          <p className="font-semibold text-navy">
            Test complete: {RESULT_LABELS[t.result]}, then {DECISION_LABELS[t.decision].toLowerCase()}.
          </p>
          <p className="mt-1 text-sm text-ink">You ran it to a result and made a decision. That&apos;s real progress.</p>
        </div>
      )}
      {t.status === "abandoned" && (
        <div className="mb-6 rounded-xl border border-line bg-sand/60 p-4 text-sm text-ink">
          <span className="font-semibold">Stopped early{t.closedOn ? ` on ${formatDate(t.closedOn)}` : ""}.</span> {t.abandonReason}
        </div>
      )}
      {view.broken.length > 0 && <BrokenLinks links={view.broken} />}
      {t.seeded && <SeededNote path={view.path} source={t.source} />}

      <div className="space-y-4">
        <section aria-labelledby="belief-heading" className="rounded-xl border border-line bg-sand/50 p-5">
          <h2 id="belief-heading" className="font-semibold text-navy">
            Belief <span className="text-sm font-normal text-muted">· what you think is true, not yet evidence</span>
          </h2>
          <p className="mt-2 text-ink">{t.belief}</p>
          {t.risk && (
            <p className="mt-2 text-sm text-muted">
              <span className="font-medium text-ink">Why it might be wrong: </span>
              {t.risk}
            </p>
          )}
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-medium text-ink">The test</dt>
              <dd className="text-muted">{t.test}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Supported if</dt>
              <dd className="text-muted">{t.successCriteria}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Contradicted if</dt>
              <dd className="text-muted">{t.failureCriteria}</dd>
            </div>
          </dl>
          {view.sections.plan && (
            <div className="mt-4 text-sm">
              <p className="font-medium text-ink">Plan</p>
              <p className="whitespace-pre-wrap text-muted">{view.sections.plan}</p>
            </div>
          )}
        </section>

        <section aria-labelledby="evidence-heading" className="rounded-xl border border-l-4 border-line border-l-teal-dark bg-paper p-5">
          <h2 id="evidence-heading" className="font-semibold text-navy">
            Evidence <span className="text-sm font-normal text-muted">· what happened, with its source</span>
          </h2>
          <p className="mt-2 text-sm text-ink">
            <span className="font-medium">Strength (your rating): </span>
            {STRENGTH_LABELS[t.evidenceStrength]}
          </p>
          {(view.linked.length > 0 || customerEvidenceCount > 0) && (
            <p className="mt-1 text-sm text-muted">
              {view.linked.length} linked · {customerEvidenceCount} customer evidence
            </p>
          )}
          {view.linked.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No conversations linked yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {view.linked.map((c) => (
                <li key={c.path} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    <Link href={`/conversations/${c.slug}`} className="font-medium text-teal-dark hover:text-navy">
                      {c.label}
                    </Link>
                    <span className="text-muted">{c.date ? formatDate(c.date) : "date unknown"}</span>
                    <Badge tone={countsAsEvidence(c) ? "good" : "neutral"}>
                      {!isCustomerEvidence(c.type) ? `${TYPE_LABELS[c.type]} · advice` : c.seeded ? `${TYPE_LABELS[c.type]} · imported, not yet confirmed` : `${TYPE_LABELS[c.type]} · evidence`}
                    </Badge>
                  </span>
                  {open && <ActionButton action={unlinkEvidenceAction} fields={{ test: view.path, conversation: c.path }} label="Unlink" ariaLabel={`Unlink ${c.label}`} variant="quiet" />}
                </li>
              ))}
            </ul>
          )}
          {/* A broken link (the conversation is gone or can't be read) can still be unlinked even on a closed test. */}
          {view.broken.map((b) => (
            <p key={b.target} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-xs text-[#8a2d1c]">{b.target} (can&apos;t be found)</span>
              <ActionButton action={unlinkEvidenceAction} fields={{ test: view.path, conversation: b.target }} label="Unlink" ariaLabel={`Unlink ${b.target}`} variant="quiet" />
            </p>
          ))}
          {view.sections.evidence && <p className="mt-3 text-sm whitespace-pre-wrap text-ink">{view.sections.evidence}</p>}
          {open ? (
            <div className="mt-4 space-y-4 border-t border-line pt-4">
              {view.conversations.length === 0 ? (
                <p className="text-sm text-muted">
                  No conversations logged yet.{" "}
                  <Link href="/conversations/new" className="font-medium text-teal-dark hover:text-navy">
                    Log a conversation
                  </Link>
                </p>
              ) : (
                <LinkForm
                  fixed={{ name: "test", value: view.path }}
                  choose="conversation"
                  label="Link a conversation"
                  submit="Link it"
                  options={linkable.map((c) => ({ value: c.path, label: `${c.label} · ${c.date ?? "date unknown"} (${TYPE_LABELS[c.type]})` }))}
                />
              )}
              <StrengthForm path={view.path} value={t.evidenceStrength} />
              <EvidenceNotesForm path={view.path} initial={view.sections.evidence} />
            </div>
          ) : (
            <p className="mt-4 border-t border-line pt-4 text-sm text-muted">{CLOSED_NOTE}</p>
          )}
        </section>

        {t.status === "complete" && t.result && t.decision && (
          <>
            <section aria-labelledby="learning-heading" className="rounded-xl border border-teal/30 bg-aqua/30 p-5">
              <h2 id="learning-heading" className="font-semibold text-navy">
                What we learned
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-ink">{view.sections.learning || "Not written."}</p>
            </section>
            <section aria-labelledby="decision-heading" className="rounded-xl border-2 border-navy bg-paper p-5">
              <h2 id="decision-heading" className="font-semibold text-navy">
                Decision
              </h2>
              <p className="mt-2 text-ink">
                <span className="font-semibold">Result:</span> {RESULT_LABELS[t.result]} · <span className="font-semibold">Decision:</span> {DECISION_LABELS[t.decision]}
              </p>
              <p className="mt-2 text-sm whitespace-pre-wrap text-ink">{whyFrom(view.sections.decisionWhy)}</p>
              {t.nextCommitment && (
                <p className="mt-2 text-sm text-ink">
                  <span className="font-medium">Next commitment:</span> {t.nextCommitment}
                  {t.nextCommitmentDue ? ` · due ${formatDate(t.nextCommitmentDue)}` : ""}
                </p>
              )}
            </section>
          </>
        )}

        {t.status === "running" && (
          <Card title="Finish the test">
            <CompleteTestForm path={view.path} strength={t.evidenceStrength} />
          </Card>
        )}
        {t.status === "planned" && (
          <Card title="Ready to start?">
            <p className="mb-3 text-sm text-muted">Starting it makes it your current test on Today.</p>
            <ActionButton action={startTestAction} fields={{ path: view.path }} label="Start this test" />
          </Card>
        )}
        {open && <AbandonTestForm path={view.path} />}
      </div>
    </>
  );
}
