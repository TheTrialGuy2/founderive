import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatDate, PageHeader } from "@/components/ui";
import { buttonPrimary, buttonQuiet } from "@/components/workbook/form";
import { ConfirmAllImports } from "@/components/people/ConfirmAllImports";
import { PlanConversation } from "@/components/people/PlanConversation";
import { ActionButton } from "@/components/today/ActionButton";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { archiveImportedConversationAction, confirmImportedConversationAction } from "@/app/(workbook)/people/actions";
import { loadAreaOptions } from "@/commands/canvas";
import { loadPeople, type PeopleFilter } from "@/commands/lists";
import { loadFounderToday } from "@/commands/today";
import { addDays, isoWeekId } from "@/core/week";
import { areaLabel } from "@/lib/loop-labels";

export default function PeoplePage({ searchParams }: PageProps<"/people">) {
  return (
    <>
      <PageHeader title="People">
        Everyone you&apos;ve talked to. Conversations with feedback from possible customers count toward your weekly goal.
      </PageHeader>
      <Suspense fallback={null}>
        {searchParams.then((sp) => {
          const show = filterOf(sp.show);
          return (
            <Suspense fallback={null}>
              <People show={show} moved={show === "imported" ? movedOf(sp.moved) : null} />
            </Suspense>
          );
        })}
      </Suspense>
    </>
  );
}

const filterOf = (v: string | string[] | undefined): PeopleFilter => (v === "all" ? "all" : v === "imported" ? "imported" : "feedback");
/** Where "Not mine" moved a conversation, from the address it redirects to; anything else is ignored. */
const movedOf = (v: string | string[] | undefined): string | null => (typeof v === "string" && /^_archive\/conversations\/[^/]+\.md$/.test(v) ? v : null);

/** The quiet second action: plan a conversation for this week (stamped with this week's id, so a stale page is refused). */
async function Plan() {
  await connection();
  const [today, steps] = await Promise.all([loadFounderToday(), loadAreaOptions()]);
  return <PlanConversation weekId={isoWeekId(today)} tomorrow={addDays(today, 1)} steps={steps} />;
}

async function People({ show, moved }: { show: PeopleFilter; moved: string | null }) {
  await connection();
  const { cards, total, imported, flaggedImports } = await loadPeople(show);
  // On the Imported filter, Confirm all is the one main action while anything waits, so logging goes quiet there.
  const confirming = show === "imported" && cards.length > 0;
  const tab = (href: string, label: string, on: boolean) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={`rounded-md px-3 py-1 text-sm ${on ? "bg-navy font-semibold text-white" : "text-teal-dark hover:bg-aqua/45"}`}>
      {label}
    </Link>
  );
  const waiting = imported + flaggedImports.length;
  const importedLabel = `Imported · ${imported}${flaggedImports.length > 0 ? ` (+${flaggedImports.length} to fix)` : ""}`;
  return (
    <>
      <Link href="/conversations/new" className={confirming ? buttonQuiet : buttonPrimary}>
        Log someone you talked to
      </Link>
      <Suspense fallback={null}>
        <Plan />
      </Suspense>
      <section className="mt-8">
        <nav aria-label="Filter people" className="mb-4 inline-flex gap-1 rounded-lg border border-line bg-paper p-1">
          {tab("/people", "With feedback", show === "feedback")}
          {tab("/people?show=all", "Everyone", show === "all")}
          {(waiting > 0 || show === "imported") && tab("/people?show=imported", importedLabel, show === "imported")}
        </nav>
        {show === "imported" ? (
          <Imported cards={cards} flagged={flaggedImports} moved={moved} />
        ) : total === 0 ? (
          <>
            <p className="text-sm text-muted">Nobody logged yet. Every conversation you log shows here.</p>
            <p className="mt-2 text-sm text-muted">Or tell Claude: &quot;I talked to an agency owner today. Here are my notes.&quot;</p>
          </>
        ) : cards.length === 0 ? (
          <p className="text-sm text-muted">
            No conversations with feedback yet.{" "}
            {imported > 0 ? (
              <Link href="/people?show=imported" className="font-medium text-teal-dark hover:text-navy">
                Review {imported} imported
              </Link>
            ) : (
              <Link href="/people?show=all" className="font-medium text-teal-dark hover:text-navy">
                Show everyone
              </Link>
            )}
          </p>
        ) : (
          <ul className="space-y-2">
            {cards.map((c) => (
              <li key={c.slug}>
                <PersonLink c={c} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

type Card = Awaited<ReturnType<typeof loadPeople>>["cards"][number];

function PersonLink({ c }: { c: Card }) {
  return (
    <Link href={`/conversations/${c.slug}`} className="block min-w-0 flex-1 rounded-xl border border-line bg-paper p-4 hover:border-teal-dark">
      <span className="font-medium text-navy">{c.person}</span>{" "}
      <span className="text-sm text-muted">
        · {c.role} · {formatDate(c.date)}
        {c.imported ? " · imported, not confirmed yet" : !c.feedback && " · advice or no notes yet"}
      </span>
      {c.line && <span className="mt-1 block text-sm text-ink italic">&ldquo;{c.line}&rdquo;</span>}
      {c.steps.length > 0 && <span className="mt-1 block text-xs text-muted">{c.steps.map(areaLabel).join(" · ")}</span>}
    </Link>
  );
}

/** Imported conversations wait here until the founder confirms them; only then do they count as people talked to. */
function Imported({ cards, flagged, moved }: { cards: Card[]; flagged: { path: string; error: string }[]; moved: string | null }) {
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        These came from an import. Read them, then confirm. Once confirmed, customer conversations count toward people talked to. If one isn&apos;t yours, choose Not mine.
      </p>
      {moved && (
        <p role="status" className="mb-3 text-sm text-ink">
          Moved to <span className="font-mono text-xs">founder-data/{moved}</span>. To undo, move the file back to <span className="font-mono text-xs">founder-data/conversations/</span>.
        </p>
      )}
      <ConfirmAllImports paths={cards.map((c) => c.path)} />
      {cards.length === 0 && flagged.length === 0 && (
        <p className="text-sm text-muted">
          {moved ? "Nothing else waits for you." : "Nothing waiting. Everything you imported is confirmed."}{" "}
          <Link href="/people" className="font-medium text-teal-dark hover:text-navy">
            With feedback
          </Link>
        </p>
      )}
      {cards.length > 0 && (
        <ul className="space-y-2">
          {cards.map((c) => (
            <li key={c.slug} className="flex flex-wrap items-center gap-2">
              <PersonLink c={c} />
              <ActionButton action={confirmImportedConversationAction} fields={{ path: c.path }} label="Confirm" ariaLabel={`Confirm ${c.person}, ${formatDate(c.date)}`} variant="quiet" />
              <ActionButton action={archiveImportedConversationAction} fields={{ path: c.path }} label="Not mine" ariaLabel={`Not mine: move ${c.person}, ${formatDate(c.date)} to _archive`} variant="quiet" />
            </li>
          ))}
        </ul>
      )}
      {flagged.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-navy">Imported files to fix · {flagged.length}</h2>
          <p className="mt-1 text-sm text-muted">These can&apos;t be read, so they can&apos;t be confirmed yet. Fix each file, or ask Claude to.</p>
          <ul className="mt-2 space-y-2">
            {flagged.map((f) => (
              <li key={f.path}>
                <FlaggedFile path={f.path} error={f.error} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
