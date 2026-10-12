"use client";

import Link from "next/link";
import { Badge, Card, PageHeader, Ring, formatDate } from "@/components/ui";
import { seed } from "@/data/repo";
import { useDemo } from "@/state/DemoStore";
import { metricValue } from "@/state/derived";

const MILESTONE_TONE = { on_track: "good", behind: "bad", done: "dark" } as const;
const MILESTONE_LABEL = { on_track: "On track", behind: "Behind", done: "Done" } as const;

export default function ProgressPage() {
  const { conversations } = useDemo();

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <PageHeader eyebrow="Your record" title="Progress" />
        <Link href="/founder/conversations/new" className="mb-6 rounded-lg bg-navy px-4 py-2 text-sm text-white">
          Log a conversation
        </Link>
      </div>

      <div className="space-y-6">
        {seed.outcomes.map((o, i) => (
          <Card key={o.id} title={`Outcome ${i + 1}: ${o.title}`}>
            <div className="space-y-5">
              {seed.metrics
                .filter((m) => m.outcomeId === o.id)
                .map((m) => {
                  const current = metricValue(m, conversations);
                  const log = seed.observations.filter((ob) => ob.metricId === m.id);
                  return (
                    <div key={m.id} className="flex gap-4 rounded-lg border border-line p-4">
                      <Ring value={current.value} max={m.target} label={`by ${formatDate(m.targetAt)}`} size={72} />
                      <div className="min-w-0 flex-1">
                      <p className="font-medium text-navy">{m.name}</p>
                      <p className="mt-1 text-xs text-muted" title={m.definition}>
                        Baseline {m.baseline} · {formatDate(m.baselineAt)}
                        {m.countingRule && ` · auto-counted · ${current.excluded.length} excluded`}
                      </p>
                      {log.length > 0 && (
                        <ul className="mt-3 space-y-1 text-xs">
                          {log.map((ob) => (
                            <li key={ob.id} className={ob.retractedReason ? "text-muted" : ""}>
                              <span className={ob.retractedReason ? "line-through" : ""}>
                                {formatDate(ob.observedAt)}: {ob.value} ({ob.source})
                              </span>
                              {ob.retractedReason && <span className="ml-2 no-underline">Retracted: {ob.retractedReason}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        ))}

        <Card title="Program milestones · halfway check">
          <ul className="space-y-3">
            {seed.milestones.map((ms) => (
              <li key={ms.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{ms.title}</p>
                  <p className="text-xs text-muted">
                    Halfway: {ms.halfwayCheck} · due {formatDate(ms.dueAt)}
                  </p>
                </div>
                <Badge tone={MILESTONE_TONE[ms.status]}>{MILESTONE_LABEL[ms.status]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
