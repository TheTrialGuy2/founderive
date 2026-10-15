import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, formatDate, PageHeader } from "@/components/ui";
import { CopyPrompt } from "@/components/workbook/CopyPrompt";
import { EmptyState } from "@/components/workbook/EmptyState";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { Pagination } from "@/components/workbook/Pagination";
import { buttonPrimary } from "@/components/workbook/form";
import { loadConversations, type ConversationRow } from "@/commands/conversations";
import { loadPromptContext } from "@/commands/today";
import { fillPrompt, importPrompt, SKILL_PROMPTS } from "@/lib/prompts";
import { TYPE_LABELS } from "@/lib/loop-labels";
import { pageHref, pageNumber, paginate, type PageSlice } from "@/lib/pagination";

export default function ConversationsPage({ searchParams }: PageProps<"/conversations">) {
  return (
    <>
      <PageHeader title="Conversations">Customer and prospect conversations are evidence. Advice from mentors, investors and partners is kept separately.</PageHeader>
      <Suspense fallback={null}>
        {searchParams.then((sp) => (
          <ConversationsContent evidencePage={pageNumber(sp.evidencePage)} advicePage={pageNumber(sp.advicePage)} />
        ))}
      </Suspense>
    </>
  );
}

async function ConversationsContent({ evidencePage, advicePage }: { evidencePage: number; advicePage: number }) {
  await connection();
  const [{ evidence, advice, flagged }, promptVars] = await Promise.all([loadConversations(), loadPromptContext()]);
  const empty = evidence.length === 0 && advice.length === 0;
  const pagedEvidence = paginate(evidence, evidencePage);
  const pagedAdvice = paginate(advice, advicePage);
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
        <EmptyState title="No conversations logged yet" detail="Log each talk while it's fresh: their words, what they do today, and what you promised to follow up on.">
          <Link href="/conversations/new" className={`${buttonPrimary} mt-4`}>
            Log a conversation
          </Link>
          <CopyPrompt prompts={{ fileChat: fillPrompt(SKILL_PROMPTS.conversations, promptVars), pasteBridge: importPrompt(promptVars) }} />
        </EmptyState>
      ) : (
        <>
          <div className="mb-8">
            <Link href="/conversations/new" className={buttonPrimary}>
              Log a conversation
            </Link>
          </div>
          <section aria-labelledby="evidence-heading">
            <h2 id="evidence-heading" className="font-semibold text-navy">
              Customer evidence · {evidence.length}
            </h2>
            <p className="text-sm text-muted">Customers and prospects</p>
            {evidence.length === 0 ? <p className="mt-3 text-sm text-muted">None yet. Advice isn&apos;t customer evidence.</p> : <ConversationList page={pagedEvidence} otherPage={pagedAdvice.page} kind="evidence" />}
          </section>
          <section aria-labelledby="advice-heading" className="mt-10">
            <h2 id="advice-heading" className="font-semibold text-navy">
              Advice and other · {advice.length}
            </h2>
            <p className="text-sm text-muted">Mentors, investors, partners and others. Useful, but not evidence that customers want this.</p>
            {advice.length === 0 ? <p className="mt-3 text-sm text-muted">None yet.</p> : <ConversationList page={pagedAdvice} otherPage={pagedEvidence.page} kind="advice" />}
          </section>
        </>
      )}
    </>
  );
}

function ConversationList({ page, otherPage, kind }: { page: PageSlice<ConversationRow>; otherPage: number; kind: "evidence" | "advice" }) {
  const pageKey = kind === "evidence" ? "evidencePage" : "advicePage";
  const otherKey = kind === "evidence" ? "advicePage" : "evidencePage";
  const anchor = kind === "evidence" ? "#evidence-heading" : "#advice-heading";
  return (
    <>
      <ul className="mt-3 space-y-2">
      {page.items.map((r) => {
        const open = r.data.followUps.filter((f) => f.status === "open").length;
        const tests = r.data.relatedTests.length;
        const facts = [r.data.date ? formatDate(r.data.date) : "Date unknown", open ? `${open} open follow-up${open === 1 ? "" : "s"}` : null, tests ? `linked to ${tests} test${tests === 1 ? "" : "s"}` : null].filter(Boolean);
        return (
          <li key={r.path}>
            <Link
              href={`/conversations/${r.slug}`}
              className={`block rounded-lg border border-line p-4 hover:border-teal-dark ${kind === "evidence" ? "border-l-4 border-l-teal-dark bg-paper" : "bg-sand/40"}`}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-navy">
                  {r.data.person}
                  {r.data.org ? ` · ${r.data.org}` : ""}
                </span>
                <Badge tone={kind === "evidence" ? "good" : "neutral"}>{TYPE_LABELS[r.data.type]}</Badge>
                {r.data.seeded && <Badge tone="warn">Imported — confirm</Badge>}
              </span>
              <span className="mt-1 block text-sm text-muted">{facts.join(" · ")}</span>
            </Link>
          </li>
        );
      })}
      </ul>
      <Pagination
        {...page}
        itemLabel={kind === "evidence" ? "customer conversations" : "advice conversations"}
        hrefForPage={(number) => `${pageHref("/conversations", { [otherKey]: otherPage > 1 ? String(otherPage) : undefined }, pageKey, number)}${anchor}`}
      />
    </>
  );
}
