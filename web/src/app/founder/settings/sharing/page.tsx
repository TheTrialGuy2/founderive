"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { Badge, LayerBadge, PageHeader } from "@/components/ui";
import { seed } from "@/data/repo";
import type { Layer } from "@/data/types";
import { useDemo } from "@/state/DemoStore";

// Named presets over the three layers: founders think in relationships, not permission matrices.
const PRESETS: { name: string; who: string; layers: Layer[]; sees: string[] }[] = [
  {
    name: "Program team",
    who: "Facilitators and staff, while you're enrolled",
    layers: ["program", "reported"],
    sees: ["Homework and attendance", "Milestones and halfway check", "Profile answers you share", "Check-in numbers"],
  },
  {
    name: "Mentor team",
    who: "Your mentors",
    layers: ["program"],
    sees: ["Agendas you share", "Homework status", "Profile answers you share"],
  },
  {
    name: "Capital partner",
    who: "Partners you choose, one at a time",
    layers: ["reported"],
    sees: ["Readiness checklist", "Check-in numbers", "Your one-liner"],
  },
];

const NEVER = ["Conversations and quotes", "Contacts", "Notes", "Finances"];

export default function SharingPage() {
  const { optIns } = useDemo();
  const sharedWith = seed.capitalPartners.filter((p) => optIns.includes(p.id)).map((p) => p.name);

  return (
    <>
      <PageHeader eyebrow="Settings" title="Who sees what" />

      <div className="grid gap-4 md:grid-cols-3">
        {PRESETS.map((p) => (
          <section key={p.name} className="flex flex-col rounded-xl border border-line bg-paper p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium text-navy">{p.name}</h2>
              <div className="flex gap-1">
                {p.layers.map((l) => (
                  <LayerBadge key={l} layer={l} />
                ))}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted">{p.who}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {p.sees.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <Icon name="check" size={14} className="text-navy" />
                  {s}
                </li>
              ))}
            </ul>
            {p.name === "Capital partner" && (
              <div className="mt-auto pt-4">
                {sharedWith.length ? (
                  <Badge tone="good">Shared with {sharedWith.join(", ")}</Badge>
                ) : (
                  <Link href="/founder/capital" className="text-sm text-navy underline">
                    Choose a partner
                  </Link>
                )}
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="mt-4 rounded-xl border border-dashed border-line p-5">
        <div className="flex items-center gap-2">
          <Icon name="lock" size={16} className="text-navy" />
          <h2 className="font-medium text-navy">Only you, always</h2>
          <LayerBadge layer="private" />
        </div>
        <p className="mt-2 text-sm text-muted">{NEVER.join(" · ")}</p>
      </section>

      <Link href="/operator/founders/dana" className="mt-6 inline-block text-sm text-navy underline">
        Preview what your program team sees
      </Link>
    </>
  );
}
