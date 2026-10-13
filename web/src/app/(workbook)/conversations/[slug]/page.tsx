import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, Card, formatDate, PageHeader } from "@/components/ui";
import { ConversationForm } from "@/components/conversations/ConversationForm";
import { FollowUps } from "@/components/conversations/FollowUps";
import { WhatChangesForm } from "@/components/conversations/WhatChangesForm";
import { LinkForm } from "@/components/loop/LinkForm";
import { ActionButton } from "@/components/today/ActionButton";
import { SeededNote } from "@/components/workbook/SeededNote";
import { BrokenLinks } from "@/components/workbook/BrokenLinks";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { unlinkEvidenceAction } from "@/app/(workbook)/evidence-actions";
import { loadConversation, type Conversation } from "@/commands/conversations";
import { loadFounderToday } from "@/commands/today";
import { isCustomerEvidence } from "@/core/conversations";
import { AREA_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/loop-labels";

export default function ConversationPage({ params }: PageProps<"/conversations/[slug]">) {
  return (
    <Suspense fallback={<PageHeader eyebrow="Conversation" title="Loading…" />}>
      {params.then(({ slug }) => (
        <ConversationContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function ConversationContent({ slug }: { slug: string }) {
  await connection();
  const [view, today] = await Promise.all([loadConversation(slug), loadFounderToday()]);
  if (view.status === "missing") {
    return (
      <>
        <PageHeader eyebrow="Conversation" title="Conversation not found" />
        <p className="text-sm text-muted">
          There&apos;s no conversations/{slug}.md in founder-data. It may have been renamed or archived.{" "}
          <Link href="/conversations" className="font-medium text-teal-dark hover:text-navy">
            See all conversations
          </Link>
        </p>
      </>
    );
  }
  if (view.status === "flagged") {
    return (
      <>
        <PageHeader eyebrow="Conversation" title="This conversation can't be read" />
        <FlaggedFile path={view.path} error={view.error} />
      </>
    );
  }

  const c = view.data;
  const evidence = isCustomerEvidence(c.type);
  const testsByPath = new Map(view.tests.map((t) => [t.path, t]));
  const linkable = view.tests.filter((t) => !c.relatedTests.includes(t.path) && t.status !== "abandoned");
  const confirmed = c.whatChangesConfirmed && !!c.whatChanges;

  return (
    <>
      <PageHeader eyebrow={`${TYPE_LABELS[c.type]} · ${c.date ? formatDate(c.date) : "date unknown"}`} title={c.org ? `${c.person} · ${c.org}` : c.person} />
      <p className="-mt-4 mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={evidence ? "good" : "neutral"}>{evidence ? "Customer evidence" : "Advice, not customer evidence"}</Badge>
        {c.segment && <span className="text-sm text-muted">{c.segment}</span>}
      </p>
      {view.broken.length > 0 && <BrokenLinks links={view.broken} />}
      {c.seeded && <SeededNote path={view.path} source={c.source} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="What this changes" className="md:col-span-2">
          {confirmed ? (
            <>
              <p className="text-ink">{c.whatChanges}</p>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-teal-dark">Change it</summary>
                <div className="mt-2">
                  <WhatChangesForm path={view.path} initial={c.whatChanges ?? ""} confirmed />
                </div>
              </details>
            </>
          ) : (
            <>
              {c.whatChanges && <p className="mb-2 text-sm text-muted">A draft you haven&apos;t confirmed yet. Edit it until it says what you believe.</p>}
              <WhatChangesForm path={view.path} initial={c.whatChanges ?? ""} confirmed={false} />
            </>
          )}
        </Card>

        <Card title="What you heard and saw">
          {c.quotes.length > 0 && (
            <ul className="space-y-2">
              {c.quotes.map((q, i) => (
                <li key={i}>
                  <blockquote className="border-l-2 border-teal pl-3 text-sm text-ink italic">“{q}”</blockquote>
                </li>
              ))}
            </ul>
          )}
          <Facts
            items={[
              ["Numbers", c.numbers.join(" · ")],
              ["What they do today", c.observedBehavior],
              ["Alternatives", c.alternatives],
            ]}
          />
        </Card>

        <Card title="Follow-ups">
          <FollowUps path={view.path} followUps={c.followUps} today={today} />
        </Card>

        <Card title="Linked tests">
          {c.relatedTests.length === 0 ? (
            <p className="text-sm text-muted">Not linked to a test yet.</p>
          ) : (
            <ul className="space-y-2">
              {c.relatedTests.map((p) => {
                const t = testsByPath.get(p);
                return (
                  <li key={p} className="flex flex-wrap items-center justify-between gap-2">
                    {t ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <Link href={`/tests/${t.slug}`} className="text-sm font-medium text-teal-dark hover:text-navy">
                          {t.title}
                        </Link>
                        <Badge>{STATUS_LABELS[t.status]}</Badge>
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-[#8a2d1c]">{p} (can&apos;t be found)</span>
                    )}
                    <ActionButton action={unlinkEvidenceAction} fields={{ test: p, conversation: view.path }} label="Unlink" ariaLabel={`Unlink ${t?.title ?? p}`} variant="quiet" />
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3">
            <LinkForm
              fixed={{ name: "conversation", value: view.path }}
              choose="test"
              label="Link to a test"
              submit="Link this test"
              options={linkable.map((t) => ({ value: t.path, label: `${t.title} (${STATUS_LABELS[t.status]})` }))}
            />
          </div>
        </Card>

        <Card title="Context">
          <Facts
            items={[
              ["Context", c.context],
              ["Questions asked", c.questionsAsked],
              ["Urgency", c.urgency],
              ["How they would buy", c.buyingProcess],
              ["Areas", c.areas.map((a) => AREA_LABELS[a]).join(", ")],
            ]}
          />
        </Card>
      </div>

      <Card title="Notes" className="mt-4">
        {view.notes ? <p className="text-sm whitespace-pre-wrap text-ink">{view.notes}</p> : <p className="text-sm text-muted">No notes.</p>}
      </Card>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-teal-dark">Edit details and notes</summary>
        <div className="mt-4">
          <ConversationForm mode="edit" path={view.path} initial={formValues(c, view.notes)} />
        </div>
      </details>
    </>
  );
}

function Facts({ items }: { items: [string, string | null | undefined][] }) {
  const shown = items.filter(([, value]) => !!value);
  if (shown.length === 0) return <p className="mt-2 text-sm text-muted">Nothing recorded.</p>;
  return (
    <dl className="mt-3 space-y-2 text-sm">
      {shown.map(([label, value]) => (
        <div key={label}>
          <dt className="font-medium text-ink">{label}</dt>
          <dd className="text-muted">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formValues(c: Conversation, notes: string): Record<string, string> {
  const s = (v: string | null | undefined) => v ?? "";
  return {
    type: c.type,
    person: c.person,
    org: s(c.org),
    date: c.date ?? "",
    segment: s(c.segment),
    context: s(c.context),
    questionsAsked: s(c.questionsAsked),
    observedBehavior: s(c.observedBehavior),
    quotes: c.quotes.join("\n"),
    numbers: c.numbers.join("\n"),
    alternatives: s(c.alternatives),
    urgency: s(c.urgency),
    buyingProcess: s(c.buyingProcess),
    areas: c.areas.join(","),
    notes,
  };
}
