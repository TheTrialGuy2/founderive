"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, LayerBadge, PageHeader } from "@/components/ui";
import { useDemo } from "@/state/DemoStore";
import { reportedWithEdits } from "@/state/derived";

export default function CheckinPage() {
  const { checkinConfirmed, reportedEdits, confirmCheckin } = useDemo();
  const [edits, setEdits] = useState<Record<string, string>>(reportedEdits);
  const [editing, setEditing] = useState<string | null>(null);
  const fields = reportedWithEdits(edits);

  if (checkinConfirmed) {
    return (
      <>
        <PageHeader eyebrow="Halfway check-in" title="Confirmed. Thank you.">
          Next check-in: 3 months after the cohort ends.
        </PageHeader>
        <Card>
          <ul className="divide-y divide-line">
            {fields.map((f) => (
              <li key={f.key} className="flex justify-between gap-3 py-2 text-sm">
                <span className="text-muted">{f.label}</span>
                <span>{f.value}</span>
              </li>
            ))}
          </ul>
          <Link href="/founder/today" className="mt-4 inline-block text-sm text-navy underline">
            Back to Today
          </Link>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Halfway check-in · 1 minute" title="Still right?" />

      <Card action={<LayerBadge layer="reported" />}>
        <ul className="divide-y divide-line">
          {fields.map((f) => (
            <li key={f.key} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{f.label}</p>
                  {editing === f.key ? (
                    <input
                      autoFocus
                      defaultValue={f.value}
                      onBlur={(e) => {
                        setEdits({ ...edits, [f.key]: e.target.value });
                        setEditing(null);
                      }}
                      className="mt-1 w-full rounded border border-line bg-canvas px-2 py-1 text-sm"
                    />
                  ) : (
                    <p className="mt-0.5 font-medium">{f.value}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted">{f.source}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={f.verification === "document_verified" ? "good" : "neutral"}>
                    {f.verification === "document_verified" ? "Document-verified" : "Self-reported"}
                  </Badge>
                  <button onClick={() => setEditing(f.key)} className="text-xs text-navy underline">
                    Correct
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Button onClick={() => confirmCheckin(edits)}>Confirm all</Button>
        </div>
      </Card>
    </>
  );
}
