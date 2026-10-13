import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { TestForm } from "@/components/tests/TestForm";

export default function NewTestPage({ searchParams }: PageProps<"/tests/new">) {
  return (
    <>
      <PageHeader eyebrow="Tests" title="Design a test">
        Write the belief, a small way to check it, and what would count as supported or contradicted, before you start.
      </PageHeader>
      <Suspense fallback={null}>
        {searchParams.then((sp) => (
          <TestForm initial={{ startNow: "on", belief: typeof sp.belief === "string" ? sp.belief : "", risk: typeof sp.risk === "string" ? sp.risk : "" }} />
        ))}
      </Suspense>
    </>
  );
}
