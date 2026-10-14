import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { TestForm } from "@/components/tests/TestForm";
import { loadAreaOptions } from "@/commands/canvas";
import { safeReturnTo } from "@/lib/return-to";

export default function NewTestPage({ searchParams }: PageProps<"/tests/new">) {
  return (
    <>
      <PageHeader eyebrow="Tests" title="Design a test">
        Write the belief, a small way to check it, and what would count as supported or contradicted, before you start.
      </PageHeader>
      <Suspense fallback={null}>
        {searchParams.then((sp) => (
          <NewTest belief={typeof sp.belief === "string" ? sp.belief : ""} risk={typeof sp.risk === "string" ? sp.risk : ""} step={typeof sp.step === "string" ? sp.step : ""} />
        ))}
      </Suspense>
    </>
  );
}

async function NewTest({ belief, risk, step }: { belief: string; risk: string; step: string }) {
  await connection();
  const areaOptions = await loadAreaOptions();
  const known = areaOptions.some(([id]) => id === step);
  return (
    <TestForm
      initial={{ startNow: "on", belief, risk, area: known ? step : "" }}
      areaOptions={areaOptions}
      returnTo={known ? (safeReturnTo(`/path/${step}`) ?? undefined) : undefined}
    />
  );
}
