import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { firstIncompleteStep, LAST_STEP } from "@/commands/setup";
import { readEntry } from "@/store/read";
import { SetupStep } from "./SetupStep";

export default function SetupPage({ searchParams }: PageProps<"/setup">) {
  return (
    <>
      <PageHeader eyebrow="About five minutes" title="Set up your venture">
        Your answers stay in founder-data on this computer.
      </PageHeader>
      <Suspense fallback={null}>
        <SetupContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SetupContent({ searchParams }: { searchParams: PageProps<"/setup">["searchParams"] }) {
  await connection();
  const founder = await readEntry("founder", "founder.md");
  const f = founder?.ok ? founder.data : null;
  const requested = Number((await searchParams).step);
  const resumeAt = firstIncompleteStep(f) ?? 1;
  const canJump = f?.setupComplete === true;
  // You can go back to any step, but not skip ahead of the first unfinished one.
  const step = Number.isInteger(requested) && requested >= 1 && requested <= (canJump ? LAST_STEP : resumeAt) ? requested : resumeAt;
  const s = (v: string | number | null | undefined) => (v == null ? "" : String(v));
  const initial: Record<string, string> = {
    name: s(f?.name),
    city: s(f?.city),
    region: s(f?.region),
    commitment: s(f?.commitment),
    cofounders: s(f?.cofounders),
    cofounderNames: JSON.stringify(f?.cofounderNames ?? []),
    venture: s(f?.venture),
    oneLiner: s(f?.oneLiner),
    stillWorking: f?.venture && f.industry && !f.oneLiner ? "on" : "",
    website: s(f?.website),
    industry: s(f?.industry),
    businessModel: s(f?.businessModel),
    startedOn: s(f?.startedOn),
    stage: s(f?.stage),
    evidence: s(f?.evidence),
    targetCustomer: s(f?.targetCustomer),
    problem: s(f?.problem),
    outcome30: s(f?.outcome30),
    hoursPerWeek: s(f?.hoursPerWeek),
    inProgram: f?.programTitle ? "on" : "",
    programTitle: s(f?.programTitle),
    programStart: s(f?.programStart),
    programWeeks: s(f?.programWeeks),
  };
  return <SetupStep key={step} step={step} initial={initial} canJump={canJump} />;
}
