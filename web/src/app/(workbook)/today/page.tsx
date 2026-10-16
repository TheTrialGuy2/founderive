import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, formatDate, PageHeader } from "@/components/ui";
import { DueList } from "@/components/home/DueList";
import { PathList } from "@/components/home/PathList";
import { SynthesizeButton } from "@/components/home/SynthesizeButton";
import { OutcomeTile, OutreachTile, TalkedToTile } from "@/components/home/WeekTiles";
import { BlockerForm } from "@/components/today/BlockerForm";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { buttonPrimary, buttonQuiet } from "@/components/workbook/form";
import { logoVersion } from "@/commands/logo";
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
  const { founder: f, today, weekId, weekStartsOn, checkinEntry, checkin, programWeek, homework, report, carried, path, talkedTo, importedWaiting, synthesizable, agentEditsWaiting, changesWaiting, dueItems, action } = view;
  const stepIndex = path.current ? path.steps.findIndex((s) => s.id === path.current?.id) + 1 : null;
  const logoV = await logoVersion();

  return (
    <>
      <PageHeader
        eyebrow={`Week of ${formatDate(weekStartsOn)}${stepIndex ? ` · Step ${stepIndex} of ${path.total}` : ""}`}
        title={
          logoV != null ? (
            <span className="inline-flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local founder-data file served by our own /api/logo route; next/image's optimizer isn't needed for a local file. */}
              <img src={`/api/logo?v=${logoV}`} alt="" className="h-10 w-auto" />
              {f.venture || "Home"}
            </span>
          ) : (
            f.venture || "Home"
          )
        }
      />
      {checkinEntry && !checkinEntry.ok && (
        <div className="mb-4">
          <FlaggedFile path={checkinEntry.path} error={checkinEntry.error} />
        </div>
      )}
      {(action?.kind === "risk" || action?.kind === "blocker") && (
        <section aria-labelledby="first-heading" className="mb-6 rounded-xl border border-line bg-sand/60 p-4">
          <h2 id="first-heading" className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
            {action.kind === "risk" ? "Before anything else" : "Your blocker"}
          </h2>
          <p className="mt-1 font-medium text-ink">{action.label}</p>
          <p className="text-sm text-muted">{action.reason}</p>
          {action.kind === "risk" ? (
            // It navigates, so it stays a link, styled as the page's one main action.
            <Link href={action.href} className={`${buttonPrimary} mt-3`}>
              Open it
            </Link>
          ) : (
            <div className="mt-3">
              <BlockerForm weekId={weekId} blocker={checkin?.blocker ?? ""} help={checkin?.helpNeeded ?? ""} primary />
            </div>
          )}
        </section>
      )}
      {action?.kind === "imports" && (
        <section aria-labelledby="imports-heading" className="mb-6 rounded-xl border border-line bg-sand/60 p-4">
          <h2 id="imports-heading" className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
            Imported, waiting for you
          </h2>
          <p className="mt-1 text-sm text-ink">{action.reason}</p>
          {/* It navigates, so it stays a link, styled as the page's one main action. */}
          <Link href={action.href} className={`${buttonPrimary} mt-3`}>
            {action.label}
          </Link>
        </section>
      )}
      {changesWaiting.length > 0 && (
        <section aria-labelledby="changes-heading" className={`mb-6 rounded-xl border border-line p-4 ${action?.kind === "interpretation" ? "bg-sand/60" : "bg-paper"}`}>
          <h2 id="changes-heading" className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
            Changes waiting for a decision · {changesWaiting.length}
          </h2>
          <p className="mt-1 font-medium text-ink">
            {changesWaiting[0].person} shared evidence you haven&apos;t connected to a change yet.
          </p>
          <p className="text-sm text-muted">Decide whether it changes a belief, feature, workflow, or next move. “Nothing yet” is a valid answer.</p>
          <Link href={changesWaiting[0].href} className={`${action?.kind === "interpretation" ? buttonPrimary : buttonQuiet} mt-3`}>
            Decide what this changes
          </Link>
        </section>
      )}
      {agentEditsWaiting.count > 0 && agentEditsWaiting.href && (
        <p className="mb-4 text-sm text-muted">
          <Link href={agentEditsWaiting.href} className="font-medium text-teal-dark hover:text-navy">
            Review {agentEditsWaiting.count} agent edit{agentEditsWaiting.count === 1 ? "" : "s"}
          </Link>
        </p>
      )}
      <SynthesizeButton count={synthesizable} />
      <div className="grid gap-4 md:grid-cols-3">
        <OutcomeTile
          weekId={weekId}
          outcome={checkin?.outcome}
          outcome30={f.outcome30}
          goals={f.goals}
          primary={action?.kind === "outcome"}
          stuck={action?.kind === "blocker" ? undefined : { blocker: checkin?.blocker ?? "", help: checkin?.helpNeeded ?? "" }}
        />
        <TalkedToTile weekId={weekId} count={talkedTo.count} goal={talkedTo.goal} lastWeekShort={talkedTo.lastWeekShort} importedWaiting={action?.kind === "imports" ? 0 : importedWaiting} />
        <OutreachTile weekId={weekId} outreach={checkin?.outreach} />
      </div>
      <div className="mt-4">
        {programWeek && <p className="mb-2 text-sm"><Link href={`/program/${programWeek}`} className="font-medium text-teal-dark hover:text-navy">{f.programTitle} · Week {programWeek}</Link></p>}
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
