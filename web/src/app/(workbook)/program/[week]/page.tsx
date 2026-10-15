import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, formatDate, PageHeader } from "@/components/ui";
import { SessionHeldForm } from "@/components/program/SessionHeldForm";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { SeededNote } from "@/components/workbook/SeededNote";
import { loadProgram, loadProgramWeek } from "@/commands/program";
import { loadFounderToday } from "@/commands/today";
import { weekFile } from "@/core/program";

export default function ProgramWeekPage({ params }: { params: Promise<{ week: string }> }) {
  return <Suspense fallback={<PageHeader eyebrow="Program" title="Loading…" />}>{params.then(({ week }) => <ProgramWeekContent value={week} />)}</Suspense>;
}

async function ProgramWeekContent({ value }: { value: string }) {
  await connection();
  const week = Number(value);
  if (!Number.isInteger(week) || week < 1) notFound();
  const [program, entry, today] = await Promise.all([loadProgram(), loadProgramWeek(week), loadFounderToday()]);
  if (program.status !== "ready" || week > program.total) notFound();
  if (!entry) return <><PageHeader eyebrow={program.title} title={`Week ${week}`} /><FlaggedFile path={weekFile(week)} error="This program week is missing." /></>;
  if (!entry.ok) return <><PageHeader eyebrow={program.title} title={`Week ${week}`} /><FlaggedFile path={entry.path} error={entry.error} /></>;
  const item = entry.data;
  const empty = item.exercises.length === 0 && item.homework.length === 0;
  return (
    <>
      <PageHeader eyebrow={`${program.title} · Week ${week} of ${program.total}`} title={item.title}>
        <Link href="/program" className="font-medium text-teal-dark hover:text-navy">All program weeks</Link>
      </PageHeader>
      {item.seeded && <SeededNote path={entry.path} source={item.source} badge="Needs confirmation" note="Confirm the imported exercises and homework when they match your program." confirmLabel="Confirm this week" primary />}
      <div className="flex flex-wrap items-center gap-2"><Badge tone={item.status === "done" ? "good" : "neutral"}>{item.status === "not-started" ? "Not started" : item.status === "in-progress" ? "In progress" : "Done"}</Badge>{item.date && <span className="text-sm text-muted">{formatDate(item.date)}</span>}</div>
      {empty && item.status === "done" && item.date ? (
        <p className="mt-4 text-ink">Session held on {formatDate(item.date)}; nothing recorded.</p>
      ) : empty && item.seeded ? (
        <p className="mt-4 text-sm text-muted">Confirm this week before recording that the session was held.</p>
      ) : empty ? (
        <section className="mt-6 rounded-xl border border-line bg-paper p-4"><h2 className="font-semibold text-navy">Record this session</h2><p className="mt-1 text-sm text-muted">Mark that it happened without inventing exercises or homework.</p><SessionHeldForm week={week} date={today} /></section>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-line bg-paper p-4"><h2 className="font-semibold text-navy">Exercises</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">{item.exercises.map((exercise) => <li key={exercise.id}>{exercise.title}</li>)}</ul></section>
          <section className="rounded-xl border border-line bg-paper p-4"><h2 className="font-semibold text-navy">Homework</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">{item.homework.map((homework) => <li key={homework.id}>{homework.title} · {homework.status}</li>)}</ul></section>
        </div>
      )}
      {entry.body.trim() && <section className="mt-6"><h2 className="font-semibold text-navy">Notes</h2><p className="mt-2 whitespace-pre-wrap text-sm text-ink">{entry.body.trim()}</p></section>}
    </>
  );
}
