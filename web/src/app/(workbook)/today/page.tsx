import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, formatDate, PageHeader } from "@/components/ui";
import { BlockerForm } from "@/components/today/BlockerForm";
import { CommitmentList } from "@/components/today/CommitmentList";
import { NextActionCard } from "@/components/today/NextActionCard";
import { OutcomeForm } from "@/components/today/OutcomeForm";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { loadToday } from "@/commands/today";

export default function TodayPage() {
  return (
    <Suspense fallback={<PageHeader title="Today" />}>
      <TodayContent />
    </Suspense>
  );
}

async function TodayContent() {
  await connection();
  const view = await loadToday();
  if (view.status === "setup") redirect("/setup");
  if (view.status === "flagged") {
    return (
      <>
        <PageHeader title="Today" />
        <FlaggedFile path={view.path} error={view.error} />
      </>
    );
  }

  const { founder: f, today, tomorrow, weekId, weekStartsOn, checkinEntry, checkin, programWeek, homework, report, next } = view;

  return (
    <>
      <PageHeader eyebrow={`${formatDate(today)} · Week of ${formatDate(weekStartsOn)}`} title="Today" />
      {checkinEntry && !checkinEntry.ok && (
        <div className="mb-4">
          <FlaggedFile path={checkinEntry.path} error={checkinEntry.error} />
        </div>
      )}
      {next ? (
        <NextActionCard action={next} weekId={weekId} today={today} tomorrow={tomorrow} programWeek={programWeek} />
      ) : (
        <Card title="Next action">
          <p className="text-sm text-muted">Nothing is waiting. Add a commitment that moves this week&apos;s outcome forward.</p>
        </Card>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {checkin?.outcome && (
          <Card title="This week's outcome">
            <p className="text-ink">{checkin.outcome}</p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-teal-dark">Change it</summary>
              <div className="mt-2">
                <OutcomeForm weekId={weekId} initial={checkin.outcome} />
              </div>
            </details>
          </Card>
        )}
        <Card title="Commitments">
          <CommitmentList
            weekId={weekId}
            today={today}
            commitments={checkin?.commitments ?? []}
            programWeek={programWeek}
            programLabel={programWeek ? `${f.programTitle} · Week ${programWeek}` : null}
            homework={homework}
          />
        </Card>
        <div id="blocker" className="scroll-mt-6">
          <Card title="Blocker or help needed">
            <BlockerForm weekId={weekId} blocker={checkin?.blocker ?? ""} help={checkin?.helpNeeded ?? ""} />
          </Card>
        </div>
      </div>
      {report.errors.length > 0 && (
        <Card title={`Files to fix · ${report.errors.length}`} className="mt-6">
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
