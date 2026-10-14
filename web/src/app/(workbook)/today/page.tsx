import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, formatDate, PageHeader } from "@/components/ui";
import { DueList } from "@/components/home/DueList";
import { PathList } from "@/components/home/PathList";
import { OutcomeTile, OutreachTile, TalkedToTile } from "@/components/home/WeekTiles";
import { BlockerForm } from "@/components/today/BlockerForm";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { loadToday } from "@/commands/today";

export default function HomePage() {
  return (
    <Suspense fallback={<PageHeader title="Home" />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  await connection();
  const view = await loadToday();
  if (view.status === "setup") redirect("/setup");
  if (view.status === "flagged") {
    return (
      <>
        <PageHeader title="Home" />
        <FlaggedFile path={view.path} error={view.error} />
      </>
    );
  }
  const { founder: f, today, weekId, weekStartsOn, checkinEntry, checkin, programWeek, homework, report, carried, path, talkedTo, dueItems, action } = view;
  const stepIndex = path.current ? path.steps.findIndex((s) => s.id === path.current?.id) + 1 : null;

  return (
    <>
      <PageHeader eyebrow={`Week of ${formatDate(weekStartsOn)}${stepIndex ? ` · Step ${stepIndex} of ${path.total}` : ""}`} title={f.venture || "Home"} />
      {checkinEntry && !checkinEntry.ok && (
        <div className="mb-4">
          <FlaggedFile path={checkinEntry.path} error={checkinEntry.error} />
        </div>
      )}
      {(action?.kind === "risk" || action?.kind === "blocker") && (
        <div role="status" className="mb-6 rounded-xl border border-line bg-sand/60 p-4">
          <p className="font-medium text-ink">{action.label}</p>
          <p className="text-sm text-muted">{action.reason}</p>
          {action.kind === "risk" ? (
            <Link href={action.href} className="mt-2 inline-block text-sm font-medium text-teal-dark hover:text-navy">
              Open it
            </Link>
          ) : (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-teal-dark">Update the blocker</summary>
              <BlockerForm weekId={weekId} blocker={checkin?.blocker ?? ""} help={checkin?.helpNeeded ?? ""} />
            </details>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <OutcomeTile weekId={weekId} outcome={checkin?.outcome} primary={action?.kind === "outcome"} />
        <TalkedToTile weekId={weekId} count={talkedTo.count} goal={talkedTo.goal} lastWeekShort={talkedTo.lastWeekShort} />
        <OutreachTile weekId={weekId} reached={talkedTo.reached} replied={talkedTo.replied} />
      </div>
      <div className="mt-4">
        <DueList
          weekId={weekId}
          today={today}
          items={dueItems}
          primaryKey={action?.kind === "overdue" ? action.key : null}
          commitments={checkin?.commitments ?? []}
          carried={carried}
          programWeek={programWeek}
          programLabel={programWeek ? `${f.programTitle} · Week ${programWeek}` : null}
          homework={homework}
        />
      </div>
      <PathList path={path} action={action} weekId={weekId} />
      {report.errors.length > 0 && (
        <Card title={`Files to fix · ${report.errors.length}`} className="mt-10">
          <ul className="space-y-2">
            {report.errors.map((e) => (
              <li key={e.path}>
                <FlaggedFile path={e.path} error={e.error} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
