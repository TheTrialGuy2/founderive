import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getFounder, listFounders } from "@/data/repo";
import { FounderOperatorView } from "./FounderOperatorView";

export function generateStaticParams() {
  return listFounders().map((f) => ({ founderId: f.id }));
}

// Params are read inside Suspense so the shell can render instantly.
export default function OperatorFounderPage({ params }: PageProps<"/demo/operator/founders/[founderId]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ founderId }) => {
        if (!getFounder(founderId)) notFound();
        return <FounderOperatorView founderId={founderId} />;
      })}
    </Suspense>
  );
}
