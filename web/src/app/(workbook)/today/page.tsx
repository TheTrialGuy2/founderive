import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, formatDate, PageHeader } from "@/components/ui";
import { BlockerForm } from "@/components/today/BlockerForm";
import { BringWhatYouHave } from "@/components/today/BringWhatYouHave";
import { CommitmentList } from "@/components/today/CommitmentList";
import { CurrentTestCard } from "@/components/today/CurrentTestCard";
import { NextActionCard } from "@/components/today/NextActionCard";
import { OutcomeForm } from "@/components/today/OutcomeForm";
import { WeekPaste } from "@/components/today/WeekPaste";
import { CopyPrompt } from "@/components/workbook/CopyPrompt";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { loadPromptContext, loadToday } from "@/commands/today";
import { fileChatPrompt, weekPrompt, weekPromptVars } from "@/lib/prompts";

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

  const { founder: f, today, tomorrow, weekId, weekStartsOn, checkinEntry, checkin, programWeek, homework, report, next, currentTest, plannedTests, followUps, capacity } = view;
  const promptVars = await loadPromptContext();
  const openCount = (checkin?.commitments ?? []).filter((c) => c.status === "open").length;
  const ending = !checkin?.outcome ? "no-outcome" : openCount === 0 ? "no-commitments" : null;
  const weekChatPrompt = weekPrompt({ ...promptVars, ...weekPromptVars(checkin) });

  return (
    <>
      <PageHeader eyebrow={`${formatDate(today)} · Week of ${formatDate(weekStartsOn)}`} title="Today" />
      {checkinEntry && !checkinEntry.ok && (
        <div className="mb-4">
          <FlaggedFile path={checkinEntry.path} error={checkinEntry.error} />
        </div>
      )}
      {checkin?.outcome && (
        <Card title="This week's outcome" className="mb-4">
          <p className="text-ink">{checkin.outcome}</p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-teal-dark">Change it</summary>
            <div className="mt-2">
              <OutcomeForm weekId={weekId} initial={checkin.outcome} />
            </div>
          </details>
        </Card>
      )}
      {next ? (
        <NextActionCard action={next} weekId={weekId} today={today} tomorrow={tomorrow} programWeek={programWeek} />
      ) : (
        <Card title="Next action">
          <p className="text-sm text-muted">Nothing is waiting. Add a commitment that moves this week&apos;s outcome forward.</p>
        </Card>
      )}
      {/* First run: both families. The browser chat's answer is pasted in "Update your week from a browser chat" below, which is open. */}
      {ending && (
        <CopyPrompt
          title="Prefer to talk it through? Ask your AI"
          prompts={{ fileChat: fileChatPrompt(ending, promptVars), pasteBridge: weekChatPrompt }}
          // Most founders use a chat in the browser, so the first-run box opens on that one.
          preferred="pasteBridge"
          after={{
            pasteBridge: (
              <a href="#week-paste" className="text-sm font-medium text-teal-dark hover:text-navy">
                Paste your chat&apos;s answer below
              </a>
            ),
          }}
        />
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <CurrentTestCard test={currentTest} plannedCount={plannedTests} today={today} />
        <Card title="Commitments and follow-ups">
          {capacity && <p className="mb-3 text-sm text-ink">{capacity}</p>}
          <CommitmentList
            weekId={weekId}
            today={today}
            commitments={checkin?.commitments ?? []}
            programWeek={programWeek}
            programLabel={programWeek ? `${f.programTitle} · Week ${programWeek}` : null}
            homework={homework}
          />
          {followUps.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {followUps.map((fu) => (
                <li key={fu.id}>
                  <Link href={fu.href} className="font-medium text-teal-dark hover:text-navy">
                    {fu.text}
                  </Link>{" "}
                  <span className="text-muted">· {fu.due < today ? `overdue since ${formatDate(fu.due)}` : "due today"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div id="blocker" className="scroll-mt-6">
          <Card title="Blocker or help needed">
            <BlockerForm weekId={weekId} blocker={checkin?.blocker ?? ""} help={checkin?.helpNeeded ?? ""} />
          </Card>
        </div>
      </div>
      {!f.bringWhatYouHave && (
        <div className="mt-6">
          <BringWhatYouHave />
        </div>
      )}
      {/* Collapsed by default; open in the first-run states, where the prompt to copy is the one under the next action. */}
      <details id="week-paste" className="mt-6 scroll-mt-6 rounded-xl border border-line bg-paper p-5" open={!!ending}>
        <summary className="cursor-pointer font-semibold text-navy">Update your week from a browser chat</summary>
        {ending ? (
          <p className="mt-3 text-sm text-muted">1. Copy the prompt under the next action (&quot;I use ChatGPT or Claude in the browser&quot;).</p>
        ) : (
          <CopyPrompt title="1. Copy this into your chat and answer its questions" prompts={{ pasteBridge: weekChatPrompt }} />
        )}
        <div className="mt-4">
          <WeekPaste
            weekId={weekId}
            open={(checkin?.commitments ?? []).filter((c) => c.status === "open").map((c) => ({ id: c.id, text: c.text }))}
            current={{ blocker: checkin?.blocker ?? null, help: checkin?.helpNeeded ?? null }}
          />
        </div>
      </details>
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
