import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, formatDate, PageHeader } from "@/components/ui";
import { BlockerForm } from "@/components/today/BlockerForm";
import { CommitmentList } from "@/components/today/CommitmentList";
import { NextActionCard } from "@/components/today/NextActionCard";
import { OutcomeForm } from "@/components/today/OutcomeForm";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { checkinPath } from "@/commands/checkin";
import { guideStepFor } from "@/core/guide";
import { nextStep } from "@/core/next-step";
import { currentWeek, weekFile } from "@/core/program";
import { resolveToday } from "@/core/today";
import { isoWeekId, weekStart } from "@/core/week";
import { checkData } from "@/store/check";
import { readEntry } from "@/store/read";

export default function TodayPage() {
  return (
    <Suspense fallback={<PageHeader title="Today" />}>
      <TodayContent />
    </Suspense>
  );
}

async function TodayContent() {
  await connection();
  const founder = await readEntry("founder", "founder.md");
  if (!founder || (founder.ok && !founder.data.setupComplete)) redirect("/setup");
  if (!founder.ok) {
    return (
      <>
        <PageHeader title="Today" />
        <FlaggedFile path={founder.path} error={founder.error} />
      </>
    );
  }

  const f = founder.data;
  const today = resolveToday(f.today);
  const weekId = isoWeekId(today);
  const checkinEntry = await readEntry("checkin", checkinPath(weekId));
  const checkin = checkinEntry?.ok ? checkinEntry.data : null;

  const inProgram = !!(f.programTitle && f.programStart && f.programWeeks);
  const programWeek = inProgram ? currentWeek({ programStart: f.programStart, today, totalWeeks: f.programWeeks ?? 1, override: f.currentWeek }) : null;
  const weekEntry = programWeek ? await readEntry("week", weekFile(programWeek)) : null;
  const homework = weekEntry?.ok ? weekEntry.data.homework : [];

  const committedGuideIds = new Set((checkin?.commitments ?? []).filter((c) => c.link?.startsWith("guide:")).map((c) => c.link!.slice(6)));
  const guide = guideStepFor(f.stage, { hasTargetCustomer: !!f.targetCustomer }, committedGuideIds);
  const report = await checkData();

  const next = nextStep({
    today,
    outcome: checkin?.outcome,
    blocker: checkin?.blocker,
    risks: [],
    currentTests: [],
    commitments: checkin?.commitments ?? [],
    followUps: [],
    guideStep: guide,
    programWork: homework.filter((h) => h.status === "open").map((h) => ({ id: h.id, title: h.title, due: h.due })),
    flagged: report.errors,
    choices: checkin?.nextStepLog ?? [],
  });

  return (
    <>
      <PageHeader eyebrow={`${formatDate(today)} · Week of ${formatDate(weekStart(today))}`} title="Today" />
      {checkinEntry && !checkinEntry.ok && (
        <div className="mb-4">
          <FlaggedFile path={checkinEntry.path} error={checkinEntry.error} />
        </div>
      )}
      {next ? (
        <NextActionCard action={next} weekId={weekId} today={today} programWeek={programWeek} />
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
