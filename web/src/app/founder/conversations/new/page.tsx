"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { draftWriteup, type DraftWriteup } from "@/core/agent";
import { useDemo } from "@/state/DemoStore";
import { interviewCount, interviewMetric } from "@/state/derived";

const SAMPLE_NOTES = `Call with Lorraine, owner of BrightPath Home Care (38 caregivers). Cold intro via the association newsletter.
- Showed her the shift-swap board early, she said "that would help"
- Overtime last month was about $3,100
- "I don't have a software budget. I have an overtime problem."
- "If it paid for itself in a month I wouldn't need to ask anyone."
- Asked me to send an estimate of overtime saved.`;

const INPUTS = ["Paste notes", "Upload recording", "Upload transcript", "Voice note"];

export default function NewConversationPage() {
  const router = useRouter();
  const { approveConversation, conversations } = useDemo();
  const interviews = interviewCount(conversations);
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<DraftWriteup | null>(null);

  const approve = () => {
    if (!draft) return;
    approveConversation(draft);
    router.push("/founder/conversations");
  };

  return (
    <>
      <PageHeader eyebrow="Conversations" title="Log a conversation" />

      {!draft ? (
        <Card>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {INPUTS.map((label, i) =>
              i === 0 ? (
                <span key={label} className="rounded-full bg-navy px-3 py-1 text-sm text-white">
                  {label}
                </span>
              ) : (
                <span key={label} aria-disabled title="Available in the full build" className="cursor-not-allowed rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted/60">
                  {label}
                </span>
              ),
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={9}
            placeholder="Who you talked to, what they said, numbers they mentioned, what you promised…"
            className="w-full rounded-lg border border-line bg-canvas p-3 text-sm"
          />
          <p className="mt-2 text-xs text-muted">Recording? Get consent on the recording.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setDraft(draftWriteup(notes))} disabled={!notes.trim()}>
              Draft write-up
            </Button>
            <Button variant="secondary" onClick={() => setNotes(SAMPLE_NOTES)}>
              Use sample notes
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-paper p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted">
                Draft · {draft.with}
                {draft.org ? `, ${draft.org}` : ""}
              </p>
              <Badge tone="warn">Waiting for your review</Badge>
            </div>
            <p className="mt-2 text-xs tracking-wide text-muted uppercase">New fact first</p>
            <p className="font-serif text-xl text-navy">{draft.newFact}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="What this changes">
              <ul className="list-disc space-y-1 pl-5 text-sm">{draft.whatThisChanges.map((w) => <li key={w}>{w}</li>)}</ul>
            </Card>
            <Card title="Verbatim quotes">
              {draft.quotes.map((q) => (
                <blockquote key={q} className="mb-2 border-l-2 border-lime pl-3 text-sm italic">{q}</blockquote>
              ))}
            </Card>
            <Card title="Numbers mentioned">
              <table className="w-full text-sm">
                <tbody>
                  {draft.numbers.map((n) => (
                    <tr key={n.label} className="border-b border-line last:border-0">
                      <td className="py-1 text-muted">{n.label}</td>
                      <td className="py-1 text-right font-medium">{n.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Follow-ups">
              <ul className="space-y-1 text-sm">
                {draft.followUps.map((f) => (
                  <li key={f.id}>
                    {f.title} <span className="text-muted">→ {f.who}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {draft.contaminationFlags.length > 0 && (
            <div className="rounded-xl border border-coral bg-coral-soft p-4 text-sm">
              <p className="font-medium text-[#8a2d1c]">Contamination check</p>
              {draft.contaminationFlags.map((f) => (
                <p key={f} className="mt-1">{f}</p>
              ))}
            </div>
          )}

          {draft.type === "customer_discovery" && (
          <Card title="Counts toward">
            <p className="text-sm">
              Customer interviews: <strong>yes</strong> (cold, target segment) · {interviews} → {interviews + 1} of {interviewMetric().target}
            </p>
          </Card>
          )}

          <div className="flex gap-2">
            <Button onClick={approve}>Approve &amp; file</Button>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Back to notes
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
