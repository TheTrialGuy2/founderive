"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORG_NAME } from "@/config";
import { Button, LayerBadge, PageHeader, ProgressBar } from "@/components/ui";
import { PHASES } from "@/data/repo";
import type { FounderBasics, Phase, ProfileAnswer, VentureType } from "@/data/types";
import { useDemo } from "@/state/DemoStore";

const STEPS = [
  { title: "The basics", keys: [] as string[] },
  { title: "Why you", keys: ["need", "positioned", "life"] },
  { title: "How you work", keys: ["limitation", "challenge"] },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, basics: savedBasics, saveProfile } = useDemo();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ProfileAnswer[]>(profile);
  const [basics, setBasics] = useState<FounderBasics>(savedBasics);
  const setBasic = <K extends keyof FounderBasics>(key: K, value: FounderBasics[K]) => setBasics((b) => ({ ...b, [key]: value }));

  const update = (key: string, patch: Partial<ProfileAnswer>) =>
    setAnswers((all) => all.map((a) => (a.key === key ? { ...a, ...patch } : a)));

  const finish = () => {
    saveProfile(answers, basics);
    router.push("/demo/founder/journey");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={`Welcome to ${ORG_NAME}`} title="Who are you?">
        About 5 minutes. Fill it in once; every program sees it.
      </PageHeader>

      <div className="mb-6">
        <ProgressBar value={step + 1} max={STEPS.length} />
        <p className="mt-2 text-xs text-muted">
          Step {step + 1} of {STEPS.length}: {STEPS[step].title}
        </p>
      </div>

      {step === 0 ? (
        <div className="space-y-4 rounded-xl border border-line bg-paper p-5">
          <p className="flex items-center gap-2 text-xs text-muted">
            <LayerBadge layer="program" />
          </p>
          {(
            [
              ["name", "Your name"],
              ["ventureName", "Venture"],
              ["oneLiner", "In one line"],
              ["city", "City"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="text-muted">{label}</span>
              <input
                value={basics[key]}
                onChange={(e) => setBasic(key, e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2"
              />
            </label>
          ))}
          <fieldset className="text-sm">
            <legend className="text-muted">Where are you right now?</legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {PHASES.map((p) => (
                <label key={p.key} className="flex items-start gap-2 rounded-lg border border-line p-2">
                  <input type="radio" name="phase" checked={p.key === basics.phase} onChange={() => setBasic("phase", p.key as Phase)} className="mt-1" />
                  <span>
                    <span className="font-medium">{p.label}</span>
                    <span className="block text-xs text-muted">{p.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="text-sm">
            <legend className="text-muted">What are you building?</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {[
                ["growth", "A high-growth startup"],
                ["main_street", "A main-street business"],
                ["unsure", "Not sure yet"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                  <input type="radio" name="type" checked={key === basics.ventureType} onChange={() => setBasic("ventureType", key as VentureType)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : (
        <div className="space-y-4">
          {STEPS[step].keys.map((key) => {
            const a = answers.find((x) => x.key === key)!;
            return (
              <div key={key} className="rounded-xl border border-line bg-paper p-5">
                <p className="font-medium text-navy">{a.question}</p>
                <textarea
                  value={a.answer}
                  onChange={(e) => update(key, { answer: e.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-line bg-canvas p-3 text-sm"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <LayerBadge layer={a.layer} />
                  <button
                    onClick={() => update(key, { layer: a.layer === "private" ? "program" : "private" })}
                    className="text-navy underline"
                  >
                    {a.layer === "private" ? "Share with my program" : "Make private"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
        ) : (
          <Button onClick={finish}>See my journey</Button>
        )}
      </div>
    </div>
  );
}
