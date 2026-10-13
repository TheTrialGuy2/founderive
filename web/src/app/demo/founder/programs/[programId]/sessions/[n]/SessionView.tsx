"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { TODAY } from "@/config";
import { CheckRow, type CheckState } from "@/components/CheckRow";
import { Icon } from "@/components/icons";
import { Badge, Builds, Card, PageHeader, formatDate } from "@/components/ui";
import type { HomeworkItem } from "@/data/types";
import { useDemo } from "@/state/DemoStore";
import { isHomeworkDone } from "@/state/derived";

const SKIP_REASONS = ["Doesn't apply to my business", "Did it another way", "Moving it to next week"];

export function SessionView({ programId, n }: { programId: string; n: number }) {
  const { programs, conversations, markHomeworkDone, skipHomework } = useDemo();
  const [skipping, setSkipping] = useState<string | null>(null);
  const program = programs.find((p) => p.id === programId)!;
  const session = program.sessions.find((s) => s.n === n)!;

  const stateOf = (h: HomeworkItem): CheckState => {
    if (h.skippedReason) return "skipped";
    if (!isHomeworkDone(h)) return "open";
    return h.evidenceIds.every((id) => conversations.some((c) => c.id === id)) ? "auto" : "done";
  };
  const isConversationWork = (h: HomeworkItem) => h.builds.toLowerCase().includes("interview");
  const done = session.homework.filter((h) => stateOf(h) !== "open").length;

  return (
    <>
      <PageHeader eyebrow={`${program.name} · ${formatDate(session.date)}`} title={`${session.n}. ${session.title}`} />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {program.sessions.map((s) => {
          const complete = s.homework.every((h) => isHomeworkDone(h) || h.skippedReason);
          return (
            <Link
              key={s.n}
              href={`/demo/founder/programs/${programId}/sessions/${s.n}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                s.n === n ? "bg-navy text-white" : complete ? "bg-lime text-navy" : "border border-line bg-paper"
              }`}
              aria-label={`Session ${s.n}`}
            >
              {s.n}
            </Link>
          );
        })}
      </div>

      {session.facilitatorNote && (
        <p className="mb-5 rounded-xl bg-aqua/30 px-4 py-3 text-sm">
          <span className="mr-2 text-xs font-medium text-navy">Facilitators</span>
          {session.facilitatorNote}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card
          title="Homework"
          className="lg:col-span-2"
          action={<Badge tone={done === session.homework.length ? "good" : "neutral"}>{`${done}/${session.homework.length}`}</Badge>}
        >
          <ul className="-my-2.5 divide-y divide-line">
            {session.homework.map((h) => {
              const state = stateOf(h);
              return (
                <Fragment key={h.id}>
                  <CheckRow
                    state={state}
                    title={h.title}
                    meta={
                      <span className="flex flex-wrap items-center gap-2">
                        <Builds>{h.builds}</Builds>
                        {h.required > 1 && <span>{`${h.evidenceIds.length} of ${h.required}`}</span>}
                        {h.skippedReason && <span>Skipped: {h.skippedReason}</span>}
                      </span>
                    }
                    href={isConversationWork(h) ? "/demo/founder/conversations/new" : undefined}
                    onCheck={isConversationWork(h) || state !== "open" ? undefined : () => markHomeworkDone(h.id, `${h.title}: done ${formatDate(TODAY)}`)}
                    right={
                      state === "open" ? (
                        <button onClick={() => setSkipping(skipping === h.id ? null : h.id)} className="text-xs text-muted underline">
                          Skip
                        </button>
                      ) : undefined
                    }
                  />
                  {skipping === h.id && (
                    <li className="flex flex-wrap gap-1.5 pb-3 pl-10">
                      {SKIP_REASONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            skipHomework(h.id, r);
                            setSkipping(null);
                          }}
                          className="rounded-full border border-line px-3 py-1 text-xs hover:bg-sand/60"
                        >
                          {r}
                        </button>
                      ))}
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ul>
        </Card>

        <Card title="Materials">
          <ul className="space-y-2 text-sm">
            {session.materials.map((m) => (
              <li key={m.title} className="flex items-center gap-2">
                <Icon name={m.kind} size={16} className="text-muted" />
                {m.title}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
