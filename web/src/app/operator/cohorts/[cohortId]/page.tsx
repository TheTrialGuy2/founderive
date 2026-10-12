import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CURRENT_COHORT_ID } from "@/config";
import { CohortView } from "./CohortView";

export function generateStaticParams() {
  return [{ cohortId: CURRENT_COHORT_ID }];
}

// Params are read inside Suspense so the shell can render instantly.
export default function CohortPage({ params }: PageProps<"/operator/cohorts/[cohortId]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ cohortId }) => {
        if (cohortId !== CURRENT_COHORT_ID) notFound();
        return <CohortView cohortId={cohortId} />;
      })}
    </Suspense>
  );
}
