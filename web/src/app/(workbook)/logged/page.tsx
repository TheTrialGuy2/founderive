import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatDate, PageHeader } from "@/components/ui";
import { buttonQuiet, inputClass } from "@/components/workbook/form";
import { loadLogged } from "@/commands/lists";

const KIND_LABELS = { conversation: "Conversation", test: "Test", decision: "Decision" } as const;

export default function LoggedPage({ searchParams }: PageProps<"/logged">) {
  return (
    <>
      <PageHeader title="Everything logged">Your conversations, tests and decisions, newest first.</PageHeader>
      <Suspense fallback={null}>
        {searchParams.then((sp) => (
          <Logged type={typeof sp.type === "string" ? sp.type : ""} q={typeof sp.q === "string" ? sp.q : ""} />
        ))}
      </Suspense>
    </>
  );
}

async function Logged({ type, q }: { type: string; q: string }) {
  await connection();
  const { rows, total } = await loadLogged({ type, q });
  const filtered = !!type || !!q;
  return (
    <>
      <form method="get" className="mb-6 flex flex-wrap items-end gap-2" role="search">
        <label className="text-sm text-ink">
          Type
          <select name="type" defaultValue={type} className={`${inputClass} mt-1`}>
            <option value="">All</option>
            <option value="conversation">Conversations</option>
            <option value="test">Tests</option>
            <option value="decision">Decisions</option>
          </select>
        </label>
        <label className="min-w-48 flex-1 text-sm text-ink">
          Search titles
          <input name="q" defaultValue={q} className={`${inputClass} mt-1`} />
        </label>
        <button type="submit" className={buttonQuiet}>
          Filter
        </button>
        {filtered && (
          <Link href="/logged" className="text-sm font-medium text-teal-dark hover:text-navy">
            Clear filter
          </Link>
        )}
      </form>
      {total === 0 ? (
        <>
          <p className="text-sm text-muted">Nothing logged yet. Conversations, tests and decisions you add show here.</p>
          <p className="mt-2 text-sm text-muted">Or tell Claude: &quot;Log the conversation I had with Dana today.&quot;</p>
        </>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing matches this filter.{" "}
          <Link href="/logged" className="font-medium text-teal-dark hover:text-navy">
            Clear filter
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
          {rows.map((r, i) => (
            <li key={`${r.kind}-${r.href}-${i}`} className="flex flex-wrap items-baseline gap-3 px-4 py-3">
              <span className="w-28 text-xs text-muted">{KIND_LABELS[r.kind]}</span>
              <Link href={r.href} className="flex-1 font-medium text-navy hover:text-teal-dark">
                {r.title}
              </Link>
              <span className="text-sm text-muted">{formatDate(r.date)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm text-muted">
        Full lists:{" "}
        <Link href="/conversations" className="text-teal-dark hover:text-navy">
          conversations
        </Link>
        ,{" "}
        <Link href="/tests" className="text-teal-dark hover:text-navy">
          tests
        </Link>
        ,{" "}
        <Link href="/decisions" className="text-teal-dark hover:text-navy">
          decisions
        </Link>
        .
      </p>
    </>
  );
}
