"use client";

import type { ReactNode } from "react";
import { CheckRow } from "@/components/CheckRow";
import { ICONS, Icon, type IconName } from "@/components/icons";
import { Badge, Builds, Button, Card, LayerBadge, PageHeader, ProgressBar, Ring, Stat, WeekDots } from "@/components/ui";

// Swatches read the live CSS variables from globals.css, so this page can't drift from the theme.
const COLORS = ["navy", "navy-light", "ink", "muted", "line", "canvas", "paper", "sand", "lime", "lime-soft", "aqua", "coral", "coral-soft"];

const RULES = [
  "Tap to complete. Lists are checklists, not reading.",
  "Numbers as rings, dots and grids, not sentences.",
  "Title, numbers, labels. At most one helper line per screen.",
  "Every homework item names the record part it builds.",
  "No points or levels. Streaks count weeks, not days.",
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 border-b border-line pb-2 text-xs font-medium tracking-wide text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <>
      <PageHeader eyebrow="Founderive" title="Design system" />

      <Section title="Rules">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </Section>

      <Section title="Color">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
          {COLORS.map((c) => (
            <div key={c}>
              <div className="h-14 rounded-lg border border-line" style={{ background: `var(--color-${c})` }} />
              <p className="mt-1 font-mono text-xs">{c}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="space-y-2">
          <p className="font-serif text-5xl text-navy">2 week streak</p>
          <p className="font-serif text-3xl text-navy">Page title · serif 3xl</p>
          <p className="font-medium text-navy">Card title · sans medium</p>
          <p className="text-sm">Body · sans sm</p>
          <p className="text-xs text-muted">Meta · sans xs muted</p>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Eyebrow · xs uppercase</p>
        </div>
      </Section>

      <Section title="Icons">
        <div className="flex flex-wrap gap-4">
          {(Object.keys(ICONS) as IconName[]).map((name) => (
            <div key={name} className="flex w-20 flex-col items-center gap-1 rounded-lg border border-line bg-paper p-3">
              <Icon name={name} size={20} className="text-navy" />
              <span className="font-mono text-[11px] text-muted">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Check rows">
        <Card>
          <ul className="-my-2.5 divide-y divide-line">
            <CheckRow state="open" title="Open: tap the circle" meta="Marcus J." onCheck={() => {}} right={<Badge>Oct 14</Badge>} />
            <CheckRow state="done" title="Done by hand" meta="Mentor team" />
            <CheckRow state="auto" title="Done automatically by a logged conversation" meta="3 of 3" />
            <CheckRow state="skipped" title="Skipped with a reason" meta="Moving it to next week" />
          </ul>
        </Card>
      </Section>

      <Section title="Progress">
        <div className="flex flex-wrap items-end gap-8">
          <Ring value={0} max={15} label="Empty" />
          <Ring value={9} max={15} label="Partial" />
          <Ring value={15} max={15} label="Complete" />
          <div className="w-48 space-y-3">
            <ProgressBar value={9} max={21} tone="navy" />
            <ProgressBar value={14} max={15} />
          </div>
          <div>
            <WeekDots weeks={[false, true, true, false, true, true, true, false]} />
            <p className="mt-1 text-xs text-muted">Week dots · this week dashed until done</p>
          </div>
        </div>
      </Section>

      <Section title="Badges & layers">
        <div className="flex flex-wrap gap-2">
          <Badge>neutral</Badge>
          <Badge tone="good">good</Badge>
          <Badge tone="warn">warn</Badge>
          <Badge tone="bad">bad</Badge>
          <Badge tone="info">info</Badge>
          <Badge tone="dark">dark</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <LayerBadge layer="private" />
          <LayerBadge layer="program" />
          <LayerBadge layer="reported" />
          <Builds>Customer interviews metric</Builds>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Cards & stats">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card title="Card title" action={<Badge>2/3</Badge>}>
            <p className="text-sm">Content</p>
          </Card>
          <Stat label="Need a nudge" value={4} />
          <Stat label="Halfway check-in" value="9/10" sub="5 verified" />
        </div>
      </Section>
    </>
  );
}
