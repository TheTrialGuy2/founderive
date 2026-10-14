import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { loadToday } from "@/commands/today";

export default function YouStepPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Your path" title="You" />}>
      <YouContent />
    </Suspense>
  );
}

async function YouContent() {
  await connection();
  const view = await loadToday();
  if (view.status !== "ready") redirect("/setup");
  const f = view.founder;
  const rows: [string, string | null | undefined, number][] = [
    ["Venture", f.venture, 2],
    ["One-liner", f.oneLiner ?? "Still working on it", 2],
    ["Who it's for", f.targetCustomer, 4],
    ["The problem", f.problem, 4],
    ["Stage", f.stage, 3],
    ["30-day outcome", f.outcome30, 4],
    ["Hours a week", f.hoursPerWeek != null ? String(f.hoursPerWeek) : null, 4],
  ];
  return (
    <>
      <Link href="/today" className="text-sm text-teal-dark hover:text-navy">
        ← Your path · Step 1 of {view.path.total}
      </Link>
      <PageHeader title="You">Who you are, what you&apos;re building, and what you want from it. You can change any of it.</PageHeader>
      <dl className="divide-y divide-line rounded-xl border border-line bg-paper">
        {rows.map(([label, value, step]) => (
          <div key={label} className="flex flex-wrap items-baseline gap-3 px-4 py-3">
            <dt className="w-36 text-sm text-muted">{label}</dt>
            <dd className="flex-1 text-ink">{value || <span className="text-muted">Not set</span>}</dd>
            <Link href={`/setup?step=${step}`} className="text-sm text-teal-dark hover:text-navy">
              Edit
            </Link>
          </div>
        ))}
      </dl>
      <section aria-labelledby="bring-heading" className="mt-10">
        <h2 id="bring-heading" className="font-semibold text-navy">
          Bring in what you already have
        </h2>
        <p className="mt-1 text-sm text-muted">Worked on this already, in a chat or in documents? Bring it in as drafts you confirm.</p>
        <p className="mt-2 flex gap-4 text-sm">
          <Link href="/import" className="font-medium text-teal-dark hover:text-navy">
            Paste from a chat
          </Link>
          <Link href="/import/folder" className="font-medium text-teal-dark hover:text-navy">
            Import a folder
          </Link>
        </p>
      </section>
    </>
  );
}
