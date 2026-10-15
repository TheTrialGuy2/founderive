import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, formatDate, PageHeader } from "@/components/ui";
import { EmptyState } from "@/components/workbook/EmptyState";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { loadProgram } from "@/commands/program";

export default function ProgramPage() {
  return <Suspense fallback={<PageHeader title="Program" />}><ProgramContent /></Suspense>;
}

async function ProgramContent() {
  await connection();
  const view = await loadProgram();
  if (view.status === "none") return <><PageHeader title="Program" /><EmptyState title="No program set up" detail="Add a program title, start date and number of weeks in setup to track sessions here." /></>;
  if (view.status === "flagged") return <><PageHeader title="Program" /><FlaggedFile path={view.path} error={view.error} /></>;
  return (
    <>
      <PageHeader eyebrow={view.current ? `Week ${view.current} of ${view.total}` : `${view.total} weeks`} title={view.title} />
      <ul className="space-y-3">
        {view.weeks.map((row, index) => {
          const week = index + 1;
          return (
            <li key={row.path} className="rounded-xl border border-line bg-paper p-4">
              {"error" in row ? <FlaggedFile path={row.path} error={row.error} /> : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={`/program/${week}`} className="font-semibold text-teal-dark hover:text-navy">{row.data.title}</Link>
                    <p className="mt-1 text-sm text-muted">{row.data.date ? formatDate(row.data.date) : "Date not recorded"} · {row.data.exercises.length} exercises · {row.data.homework.length} homework</p>
                  </div>
                  <div className="flex items-center gap-2">{week === view.current && <Badge>Current</Badge>}{row.data.seeded && <Badge tone="warn">Needs confirmation</Badge>}<Badge tone={row.data.status === "done" ? "good" : "neutral"}>{row.data.status === "not-started" ? "Not started" : row.data.status === "in-progress" ? "In progress" : "Done"}</Badge></div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
