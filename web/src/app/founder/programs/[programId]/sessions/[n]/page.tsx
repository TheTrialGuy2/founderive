import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSession, listPrograms } from "@/data/repo";
import { SessionView } from "./SessionView";

export function generateStaticParams() {
  return listPrograms().flatMap((p) => p.sessions.map((s) => ({ programId: p.id, n: String(s.n) })));
}

// Params are read inside Suspense so the shell can render instantly.
export default function SessionPage({ params }: PageProps<"/founder/programs/[programId]/sessions/[n]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ programId, n }) => {
        if (!getSession(programId, Number(n))) notFound();
        return <SessionView programId={programId} n={Number(n)} />;
      })}
    </Suspense>
  );
}
