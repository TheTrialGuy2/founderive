"use client";

import Link from "next/link";
import { ORG_NAME } from "@/config";
import { Badge, Card, LayerBadge, PageHeader, ProgressBar } from "@/components/ui";
import { dana } from "@/data/fixtures/founders";
import { PHASES } from "@/data/repo";
import type { Phase } from "@/data/types";
import { useDemo } from "@/state/DemoStore";
import { programSteps } from "@/state/derived";

type ProgramStatus = "done" | "current" | "later";

const PROGRAM_STATUS: Record<ProgramStatus, { label: string; tone: "good" | "dark" | "neutral" }> = {
  done: { label: "Completed", tone: "good" },
  current: { label: "In progress", tone: "dark" },
  later: { label: "Later", tone: "neutral" },
};

const PROGRAM_HREF: Record<string, string> = {
  esc: "/founder/programs/esc/sessions/5",
  mentor: "/founder/mentors",
  capital: "/founder/capital",
};

export default function JourneyPage() {
  const { programs, profile, basics, revisiting, toggleRevisit } = useDemo();
  const currentIndex = PHASES.findIndex((p) => p.key === basics.phase);

  const programStatus = (programId: string): ProgramStatus =>
    dana.completedProgramIds.includes(programId) ? "done" : dana.programIds.includes(programId) ? "current" : "later";

  // Funding is a track, not the finish line: offered to growth ventures, optional for everyone else.
  const phaseState = (key: Phase, i: number): { label: string; tone: "good" | "dark" | "info" | "neutral" | "warn" } => {
    if (revisiting.includes(key)) return { label: "Revisiting", tone: "warn" };
    if (key === "capital") return basics.ventureType === "growth" ? { label: "Funding track", tone: "info" } : { label: "Optional track", tone: "neutral" };
    if (i < currentIndex) return { label: "Done", tone: "good" };
    if (i === currentIndex) return { label: "You are here", tone: "dark" };
    return { label: "Next", tone: "neutral" };
  };

  return (
    <>
      <PageHeader eyebrow={ORG_NAME} title="Your journey" />

      <div className="grid gap-4 md:grid-cols-4">
        {PHASES.map((phase, i) => {
          const state = phaseState(phase.key, i);
          const here = i === currentIndex;
          return (
            <div key={phase.key} className={`flex flex-col rounded-xl border p-4 ${here ? "border-navy bg-paper shadow-sm" : "border-line bg-paper/60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-serif text-lg text-navy">{phase.label}</h2>
                <Badge tone={state.tone}>{state.label}</Badge>
              </div>
              <p className="mt-2 text-sm">{phase.outcome}</p>
              <p className="mt-3 text-xs font-medium text-muted">Evidence to move on</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {phase.evidence.map((e) => (
                  <li key={e}>· {e}</li>
                ))}
              </ul>

              <ul className="mt-4 space-y-2">
                {programs
                  .filter((p) => p.phase === phase.key)
                  .map((p) => {
                    const status = programStatus(p.id);
                    const steps = programSteps(programs, p.id);
                    const body = (
                      <div className="rounded-lg border border-line bg-canvas p-3 hover:border-navy">
                        <p className="text-sm font-medium text-navy">{p.name}</p>
                        <div className="mt-1.5">
                          <Badge tone={PROGRAM_STATUS[status].tone}>{PROGRAM_STATUS[status].label}</Badge>
                        </div>
                        {status === "current" && steps.total > 0 && (
                          <div className="mt-2">
                            <ProgressBar value={steps.done} max={steps.total} />
                          </div>
                        )}
                      </div>
                    );
                    return <li key={p.id}>{PROGRAM_HREF[p.id] ? <Link href={PROGRAM_HREF[p.id]}>{body}</Link> : body}</li>;
                  })}
              </ul>

              {i < currentIndex && (
                <button onClick={() => toggleRevisit(phase.key)} className="mt-auto pt-4 text-left text-xs text-navy underline">
                  {revisiting.includes(phase.key) ? "Done revisiting" : "Revisit this phase"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Card title="Profile" className="mt-6" action={<Link href="/onboarding" className="text-sm text-navy underline">Update profile</Link>}>
        <ul className="grid gap-2 text-sm md:grid-cols-2">
          {profile.map((a) => (
            <li key={a.key} className="rounded-lg bg-canvas p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted">{a.question}</p>
                <LayerBadge layer={a.layer} />
              </div>
              <p className="mt-1">{a.answer}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
