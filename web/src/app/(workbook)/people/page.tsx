import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatDate, PageHeader } from "@/components/ui";
import { buttonPrimary, buttonQuiet } from "@/components/workbook/form";
import { ConfirmAllImports } from "@/components/people/ConfirmAllImports";
import { PlanConversation } from "@/components/people/PlanConversation";
import { ActionButton } from "@/components/today/ActionButton";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { confirmImportedConversationAction } from "@/app/(workbook)/people/actions";
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
            <>
              {/* On the Imported filter, Confirm all is the one main action, so logging goes quiet there. */}
              <Link href="/conversations/new" className={show === "imported" ? buttonQuiet : buttonPrimary}>
                Log someone you talked to
              </Link>
              <Suspense fallback={null}>
                <Plan />
              </Suspense>
              <Suspense fallback={null}>
                <People show={show} />
              </Suspense>
            </>
          );
        })}
      </Suspense>
    </>
  );
}

const filterOf = (v: string | string[] | undefined): PeopleFilter => (v === "all" ? "all" : v === "imported" ? "imported" : "feedback");

/** The quiet second action: plan a conversation for this week (stamped with this week's id, so a stale page is refused). */
async function Plan() {
  await connection();
  const [today, steps] = await Promise.all([loadFounderToday(), loadAreaOptions()]);
  return <PlanConversation weekId={isoWeekId(today)} tomorrow={addDays(today, 1)} steps={steps} />;
}

async function People({ show }: { show: PeopleFilter }) {
  await connection();
  const { cards, total, imported, flaggedImports } = await loadPeople(show);
  const tab = (href: string, label: string, on: boolean) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={`rounded-md px-3 py-1 text-sm ${on ? "bg-navy font-semibold text-white" : "text-teal-dark hover:bg-aqua/45"}`}>
      {label}
    </Link>
  );
  const waiting = imported + flaggedImports.length;
  return (
    <section className="mt-8">
      <nav aria-label="Filter people" className="mb-4 inline-flex gap-1 rounded-lg border border-line bg-paper p-1">
        {tab("/people", "With feedback", show === "feedback")}
        {tab("/people?show=all", "Everyone", show === "all")}
        {(waiting > 0 || show === "imported") && tab("/people?show=imported", `Imported · ${imported}`, show === "imported")}
      </nav>
      {show === "imported" ? (
        <Imported cards={cards} flagged={flaggedImports} />
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
function Imported({ cards, flagged }: { cards: Card[]; flagged: { path: string; error: string }[] }) {
  return (
    <>
      <p className="mb-3 text-sm text-muted">These came from an import. Read them, then confirm. Once confirmed, customer conversations count toward people talked to.</p>
      <ConfirmAllImports count={cards.length} />
      {cards.length === 0 && flagged.length === 0 && (
        <p className="text-sm text-muted">
          Nothing waiting. Everything you imported is confirmed.{" "}
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
