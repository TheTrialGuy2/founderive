"use client";

import Link from "next/link";
import { TODAY } from "@/config";
import { CheckRow, type CheckState } from "@/components/CheckRow";
import { Icon } from "@/components/icons";
import { Badge, Card, PageHeader, Ring, WeekDots, formatDate } from "@/components/ui";
import { dana } from "@/data/fixtures/founders";
import { seed } from "@/data/repo";
import type { HomeworkItem } from "@/data/types";
import { useDemo } from "@/state/DemoStore";
import {
  currentSession,
  interviewCount,
  interviewMetric,
  interviewStreak,
  isHomeworkDone,
  nextAction,
  openFollowUps,
  readinessRows,
  supportedCount,
} from "@/state/derived";

export default function TodayPage() {
  const { conversations, programs, basics, doneTasks, optIns, markHomeworkDone, toggleTask } = useDemo();
  const session = currentSession(programs.find((p) => p.id === "esc")!)!;
  const { mine, waiting } = openFollowUps(conversations);
  const mentorHomework = seed.mentorMeetings.find((m) => m.writeup)?.writeup?.homework ?? [];
  const nextMentor = seed.mentorMeetings.find((m) => m.status === "upcoming")!;
  const { streak, weeks } = interviewStreak(conversations);
  const next = nextAction({ conversations, programs, optIns });

  const homeworkState = (h: HomeworkItem): CheckState => {
    if (h.skippedReason) return "skipped";
    if (!isHomeworkDone(h)) return "open";
    // Ticked by logged conversations rather than by hand.
    return h.evidenceIds.every((id) => conversations.some((c) => c.id === id)) ? "auto" : "done";
  };
  const isConversationWork = (h: HomeworkItem) => h.builds.toLowerCase().includes("interview");
  const sessionDone = session.homework.filter((h) => homeworkState(h) !== "open").length;

  return (
    <>
      <PageHeader eyebrow={`Monday, ${formatDate(TODAY)}`} title={`Good morning, ${basics.name.split(" ")[0]}`} />

      <Link
        href={next.href}
        className="group mb-5 flex items-center gap-4 rounded-xl border border-line border-l-4 border-l-teal bg-paper p-5 hover:border-l-teal-dark"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted uppercase">
            Next <Badge>{next.effort}</Badge>
          </p>
          <p className="mt-1 font-serif text-[1.65rem] leading-tight font-normal tracking-[-0.02em] text-navy">{next.title}</p>
          <p className="mt-1 text-sm text-muted">{next.why}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-lime group-hover:bg-teal-dark">
          <Icon name="next" size={22} />
        </span>
      </Link>

      <section className="mb-5 grid gap-4 overflow-hidden rounded-xl border border-white/5 bg-navy p-5 text-white sm:grid-cols-[1fr_auto]">
        <div>
          <p className="flex items-baseline gap-3">
            <span className="font-serif text-5xl font-normal tracking-[-0.035em] text-lime">{streak}</span>
            <span className="text-base text-white/80">week streak</span>
          </p>
          <p className="mt-1 text-xs text-white/60">Weeks in a row with a customer conversation</p>
          <div className="mt-3">
            <WeekDots weeks={weeks} />
          </div>
        </div>
        <div className="flex gap-4 rounded-lg bg-paper p-3 text-ink">
          <Ring value={interviewCount(conversations)} max={interviewMetric().target} label="Interviews" size={76} />
          <Ring value={supportedCount(conversations)} max={readinessRows(conversations).length} label="Readiness" size={76} />
        </div>
      </section>

      <p className="mb-5 text-sm">
        <span className="mr-2 rounded-md bg-aqua px-1.5 py-0.5 text-xs font-semibold text-teal-dark">Focus</span>
        {dana.focusQuestion}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title={`Before Session ${session.n} · ${formatDate(session.date)}`}
          action={<Badge tone={sessionDone === session.homework.length ? "good" : "neutral"}>{`${sessionDone}/${session.homework.length}`}</Badge>}
        >
          <ul className="-my-2.5 divide-y divide-line">
            {session.homework.map((h) => (
              <CheckRow
                key={h.id}
                state={homeworkState(h)}
                title={h.title}
                meta={h.required > 1 ? `${h.evidenceIds.length} of ${h.required}` : undefined}
                href={isConversationWork(h) ? "/demo/founder/conversations/new" : undefined}
                onCheck={isConversationWork(h) || homeworkState(h) !== "open" ? undefined : () => markHomeworkDone(h.id, `${h.title}: done ${formatDate(TODAY)}`)}
              />
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card title="You owe">
            <ul className="-my-2.5 divide-y divide-line">
              {mine.map((f) => (
                <CheckRow
                  key={f.id}
                  state={doneTasks.includes(f.id) ? "done" : "open"}
                  title={f.title}
                  meta={f.who}
                  onCheck={() => toggleTask(f.id)}
                  right={<Badge tone={f.overdue ? "bad" : "neutral"}>{formatDate(f.dueAt)}</Badge>}
                />
              ))}
              {mentorHomework.map((h, i) => (
                <CheckRow
                  key={h}
                  state={doneTasks.includes(`mentor-${i}`) ? "done" : "open"}
                  title={h}
                  meta="Mentor team"
                  onCheck={() => toggleTask(`mentor-${i}`)}
                  right={<Badge>{formatDate(nextMentor.date)}</Badge>}
                />
              ))}
            </ul>
          </Card>

          <Card title="Waiting on">
            <ul className="-my-2.5 divide-y divide-line">
              {waiting.map((f) => (
                <CheckRow
                  key={f.id}
                  state={doneTasks.includes(f.id) ? "done" : "open"}
                  title={f.title}
                  meta={f.who}
                  onCheck={() => toggleTask(f.id)}
                  right={<Badge tone={f.ageDays >= 7 ? "bad" : "warn"}>{f.ageDays}d</Badge>}
                />
              ))}
            </ul>
          </Card>
        </div>
      </div>

    </>
  );
}
