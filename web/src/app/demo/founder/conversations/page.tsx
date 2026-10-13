"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Card, LayerBadge, PageHeader, formatDate } from "@/components/ui";
import type { ConversationType } from "@/data/types";
import { seed } from "@/data/repo";
import { useDemo } from "@/state/DemoStore";
import { metricValue } from "@/state/derived";
import { TYPE_LABEL } from "@/lib/labels";


export default function ConversationsPage() {
  const { conversations } = useDemo();
  const [filter, setFilter] = useState<ConversationType | "all">("all");
  const interviews = metricValue(seed.metrics.find((m) => m.id === "m-interviews")!, conversations);
  const excludedIds = new Set(interviews.excluded.map((c) => c.id));
  const shown = [...conversations]
    .filter((c) => filter === "all" || c.type === filter)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <>
      <PageHeader eyebrow="Your record" title="Conversations" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "customer_discovery", "mentor", "peer", "investor"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-full px-3 py-1 text-sm ${filter === t ? "bg-navy text-white" : "border border-line bg-paper"}`}
            >
              {t === "all" ? "All" : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <Link href="/demo/founder/conversations/new" className="rounded-lg bg-navy px-4 py-2 text-sm text-white">
          Log a conversation
        </Link>
      </div>

      <p className="mb-4 flex items-center gap-2 text-sm text-muted">
        <LayerBadge layer="private" />
        <span>
          <strong className="text-ink">{interviews.value}</strong> interviews counted · {interviews.excluded.length} excluded
        </span>
      </p>

      <ul className="space-y-3">
        {shown.map((c) => (
          <li key={c.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">
                    {formatDate(c.occurredAt)} · {c.with}
                    {c.org ? `, ${c.org}` : ""}
                  </p>
                  <p className="mt-1 font-medium">{c.newFact}</p>
                </div>
                <div className="flex gap-1.5">
                  <Badge tone="info">{TYPE_LABEL[c.type]}</Badge>
                  {excludedIds.has(c.id) && <Badge tone="warn">Not counted: {c.relationship}</Badge>}
                </div>
              </div>
              {(c.quotes.length > 0 || c.whatThisChanges.length > 0) && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-navy">Write-up</summary>
                  <div className="mt-2 space-y-2">
                    {c.whatThisChanges.length > 0 && (
                      <div>
                        <p className="text-xs text-muted">What this changes</p>
                        <ul className="list-disc pl-5">{c.whatThisChanges.map((w) => <li key={w}>{w}</li>)}</ul>
                      </div>
                    )}
                    {c.quotes.map((q) => (
                      <blockquote key={q} className="border-l-2 border-lime pl-3 italic">{q}</blockquote>
                    ))}
                    {c.numbers.length > 0 && (
                      <p className="text-muted">{c.numbers.map((n) => `${n.label}: ${n.value}`).join(" · ")}</p>
                    )}
                    {c.contaminationFlags.map((f) => (
                      <p key={f} className="rounded bg-coral-soft p-2 text-xs">Contamination check: {f}</p>
                    ))}
                  </div>
                </details>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
