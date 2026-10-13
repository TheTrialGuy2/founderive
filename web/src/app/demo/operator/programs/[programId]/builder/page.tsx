import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProgram, listPrograms } from "@/data/repo";
import { BuilderView } from "./BuilderView";

export function generateStaticParams() {
  return listPrograms().filter((p) => p.sessions.length > 0).map((p) => ({ programId: p.id }));
}

// Params are read inside Suspense so the shell can render instantly.
export default function BuilderPage({ params }: PageProps<"/demo/operator/programs/[programId]/builder">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ programId }) => {
        const program = getProgram(programId);
        if (!program || program.sessions.length === 0) notFound();
        return <BuilderView programId={programId} />;
      })}
    </Suspense>
  );
}
