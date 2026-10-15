import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { PageHeader } from "@/components/ui";
import { NextStepLink, StepPageFrame } from "@/components/path/StepNavigation";
import { LogoRow } from "@/components/workbook/LogoRow";
import { logoVersion } from "@/commands/logo";
import { loadToday } from "@/commands/today";
import { websiteHref } from "@/core/website";

const Empty = () => <span className="text-muted">Not set</span>;

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
  const websiteLink = websiteHref(f.website);
  const rows: { label: string; step: number; content: ReactNode }[] = [
    { label: "Venture", step: 2, content: f.venture || <Empty /> },
    { label: "One-liner", step: 2, content: f.oneLiner ?? "Still working on it" },
    {
      label: "Website",
      step: 2,
      content: websiteLink ? (
        <a href={websiteLink} target="_blank" rel="noreferrer" className="text-teal-dark hover:text-navy">
          {f.website}
        </a>
      ) : f.website ? (
        f.website
      ) : (
        <Empty />
      ),
    },
    { label: "Who it's for", step: 4, content: f.targetCustomer || <Empty /> },
    { label: "The problem", step: 4, content: f.problem || <Empty /> },
    { label: "Stage", step: 3, content: f.stage || <Empty /> },
    { label: "30-day outcome", step: 4, content: f.outcome30 || <Empty /> },
    { label: "Hours a week", step: 4, content: f.hoursPerWeek != null ? String(f.hoursPerWeek) : <Empty /> },
  ];
  const logoV = await logoVersion();
  const nextStep = view.path.steps[1] ?? null;
  return (
    <StepPageFrame steps={view.path.steps} currentId="you">
      <Link href="/today" className="text-sm text-teal-dark hover:text-navy">
        ← Your path · Step 1 of {view.path.total}
      </Link>
      <PageHeader title="You">Who you are, what you&apos;re building, and what you want from it. You can change any of it.</PageHeader>
      <dl className="divide-y divide-line rounded-xl border border-line bg-paper">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-baseline gap-3 px-4 py-3">
            <dt className="w-36 text-sm text-muted">{r.label}</dt>
            <dd className="flex-1 text-ink">{r.content}</dd>
            <Link href={`/setup?step=${r.step}`} className="text-sm text-teal-dark hover:text-navy">
              Edit
            </Link>
          </div>
        ))}
        <LogoRow hasLogo={logoV != null} venture={f.venture} cacheBust={logoV ?? 0} />
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
      <footer className="mt-12 flex justify-end border-t border-line pt-6">
        <NextStepLink nextStep={nextStep} />
      </footer>
    </StepPageFrame>
  );
}
