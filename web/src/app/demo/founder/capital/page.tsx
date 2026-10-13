"use client";

import { Badge, Button, Card, LayerBadge, PageHeader } from "@/components/ui";
import { seed } from "@/data/repo";
import { useDemo } from "@/state/DemoStore";
import { readinessRows } from "@/state/derived";
import { canShareWith } from "@/core/readiness";
import { Icon } from "@/components/icons";

const STATUS_TONE = { supported: "good", partial: "warn", missing: "bad" } as const;
const KIND_LABEL = { angel_fund: "Angel fund", pitch_event: "Pitch event", grant: "Grant" } as const;

export default function CapitalPage() {
  const { conversations, optIns, toggleOptIn } = useDemo();
  const rows = readinessRows(conversations);
  const supported = rows.filter((r) => r.status === "supported").length;
  const missing = rows.filter((r) => r.status !== "supported");

  return (
    <>
      <PageHeader eyebrow="Capital readiness" title={`${supported} of ${rows.length} criteria supported`} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Reviewer criteria" className="lg:col-span-2">
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.key} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted">{r.question}</p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>
                    {r.status} · {r.evidence.length}/{r.required}
                  </Badge>
                </div>
                {r.evidence.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-muted">
                    {r.evidence.map((e) => (
                      <li key={e} className="flex items-center gap-1.5">
                        <Icon name="check" size={12} className="text-navy" />
                        {e}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card title="Finish your application">
            <p className="text-sm font-medium">NC IDEA MICRO · Spring cycle</p>
            <p className="mt-3 text-xs text-muted">Still missing</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {missing.map((r) => (
                <li key={r.key}>{r.name}</li>
              ))}
            </ul>
          </Card>

          <Card title="Share your readiness profile">
            <p className="mb-3 text-xs text-muted">
              Partners see your checklist and outcomes. Never your conversations.
            </p>
            <ul className="space-y-3">
              {seed.capitalPartners.map((p) => {
                const on = optIns.includes(p.id);
                const eligible = canShareWith(p, supported);
                return (
                  <li key={p.id} className="rounded-lg border border-line p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted">
                          {KIND_LABEL[p.kind]} · {p.checkSize}
                        </p>
                      </div>
                      {on && <Badge tone="good">Shared</Badge>}
                    </div>
                    <p className="mt-1 text-xs">{p.fit}</p>
                    <div className="mt-2">
                      {on || eligible ? (
                        <Button variant={on ? "secondary" : "primary"} onClick={() => toggleOptIn(p.id)}>
                          {on ? "Stop sharing" : "Share profile"}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted">
                          Needs {p.minSupported} of {rows.length} criteria supported. You have {supported}.
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex gap-1.5">
              <LayerBadge layer="program" />
              <LayerBadge layer="reported" />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
