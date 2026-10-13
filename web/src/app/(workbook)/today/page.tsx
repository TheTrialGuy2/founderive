import { connection } from "next/server";
import { Suspense } from "react";
import { Card, formatDate, PageHeader } from "@/components/ui";
import { EmptyState } from "@/components/workbook/EmptyState";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { currentWeek, weekDate, weekFile } from "@/core/program";
import { resolveToday } from "@/core/today";
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
  if (!founder) {
    return (
      <>
        <PageHeader title="Today" />
        <EmptyState title="No founder-data yet" detail="Run pnpm init-data in web/, then reload." />
      </>
    );
  }
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
  const week = currentWeek({ programStart: f.programStart, today, totalWeeks: f.programWeeks, override: f.currentWeek });
  const weekEntry = week ? await readEntry("week", weekFile(week)) : null;
  const report = await checkData();

  return (
    <>
      <PageHeader eyebrow={formatDate(today)} title="Today" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="This week">
          {week === null ? (
            <p className="text-muted">Program not started</p>
          ) : (
            <>
              <p className="text-xs text-muted">
                {f.programTitle} · Week {week} of {f.programWeeks}
                {f.programStart ? ` · ${formatDate(weekDate(f.programStart, week))}` : ""}
              </p>
              <p className="mt-1 font-serif text-xl text-navy">{weekEntry?.ok ? weekEntry.data.title : `Week ${week}`}</p>
              {weekEntry && !weekEntry.ok && (
                <div className="mt-3">
                  <FlaggedFile path={weekEntry.path} error={weekEntry.error} />
                </div>
              )}
            </>
          )}
        </Card>
        <Card title="Venture">
          <p className="font-serif text-xl text-navy">{f.venture || "—"}</p>
          <p className="text-sm text-muted">{f.name || "Add your name in founder.md"}</p>
        </Card>
      </div>
      {report.errors.length > 0 && (
        <Card title={`Files to fix · ${report.errors.length}`} className="mt-4">
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
