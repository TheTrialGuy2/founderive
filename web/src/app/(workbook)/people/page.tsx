import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatDate, PageHeader } from "@/components/ui";
import { buttonPrimary } from "@/components/workbook/form";
import { PlanConversation } from "@/components/people/PlanConversation";
import { loadAreaOptions } from "@/commands/canvas";
import { loadPeople } from "@/commands/lists";
import { loadFounderToday } from "@/commands/today";
import { addDays, isoWeekId } from "@/core/week";
import { areaLabel } from "@/lib/loop-labels";

export default function PeoplePage({ searchParams }: PageProps<"/people">) {
  return (
    <>
      <PageHeader title="People">
        Everyone you&apos;ve talked to. Conversations with feedback from possible customers count toward your weekly goal.
      </PageHeader>
      <Link href="/conversations/new" className={buttonPrimary}>
        Log someone you talked to
      </Link>
      <Suspense fallback={null}>
        <Plan />
      </Suspense>
      <Suspense fallback={null}>
        {searchParams.then((sp) => (
          <People show={sp.show === "all" ? "all" : "feedback"} />
        ))}
      </Suspense>
    </>
  );
}

/** The quiet second action: plan a conversation for this week (stamped with this week's id, so a stale page is refused). */
async function Plan() {
  await connection();
  const [today, steps] = await Promise.all([loadFounderToday(), loadAreaOptions()]);
  return <PlanConversation weekId={isoWeekId(today)} tomorrow={addDays(today, 1)} steps={steps} />;
}

async function People({ show }: { show: "feedback" | "all" }) {
  await connection();
  const { cards, total } = await loadPeople(show);
  const tab = (href: string, label: string, on: boolean) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={`rounded-md px-3 py-1 text-sm ${on ? "bg-navy font-semibold text-white" : "text-teal-dark hover:bg-aqua/45"}`}>
      {label}
    </Link>
  );
  return (
    <section className="mt-8">
      <nav aria-label="Filter people" className="mb-4 inline-flex gap-1 rounded-lg border border-line bg-paper p-1">
        {tab("/people", "With feedback", show === "feedback")}
        {tab("/people?show=all", "Everyone", show === "all")}
      </nav>
      {total === 0 ? (
        <>
          <p className="text-sm text-muted">Nobody logged yet. Every conversation you log shows here.</p>
          <p className="mt-2 text-sm text-muted">Or tell Claude: &quot;I talked to an agency owner today. Here are my notes.&quot;</p>
        </>
      ) : cards.length === 0 ? (
        <p className="text-sm text-muted">
          No conversations with feedback yet.{" "}
          <Link href="/people?show=all" className="font-medium text-teal-dark hover:text-navy">
            Show everyone
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {cards.map((c) => (
            <li key={c.slug}>
              <Link href={`/conversations/${c.slug}`} className="block rounded-xl border border-line bg-paper p-4 hover:border-teal-dark">
                <span className="font-medium text-navy">{c.person}</span>{" "}
                <span className="text-sm text-muted">
                  · {c.role} · {formatDate(c.date)}
                  {!c.feedback && " · advice or no notes yet"}
                </span>
                {c.line && <span className="mt-1 block text-sm text-ink italic">&ldquo;{c.line}&rdquo;</span>}
                {c.steps.length > 0 && <span className="mt-1 block text-xs text-muted">{c.steps.map(areaLabel).join(" · ")}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
