"use client";

import { useState } from "react";
import { Badge, Button, Card, LayerBadge, PageHeader, formatDate } from "@/components/ui";
import { dana } from "@/data/fixtures/founders";
import { seed } from "@/data/repo";
import { useDemo } from "@/state/DemoStore";
import { interviewCount, interviewMetric, metricValue, recentDiscovery } from "@/state/derived";

export default function MentorsPage() {
  const { conversations } = useDemo();
  const [shared, setShared] = useState(false);
  const last = seed.mentorMeetings.find((m) => m.status === "held")!;
  const next = seed.mentorMeetings.find((m) => m.status === "upcoming")!;
  const pilotMetric = seed.metrics.find((m) => m.id === "m-pilots")!;
  const pilots = metricValue(pilotMetric, conversations).value;

  const agenda: { heading: string; body: string[] }[] = [
    { heading: "1. Welcome / check-in", body: ["Quick personal check-in."] },
    {
      heading: "2. Review of previous action items",
      body: last.writeup!.homework.map((h, i) => `${h}: ${i === 0 ? "3 of 5 done" : "rough estimate ready"}`),
    },
    { heading: "3. Meeting objectives", body: ["Pressure-test flat per-agency pricing", "Decide whether to pitch owners or schedulers first"] },
    {
      heading: "4. Where I am today",
      body: [
        `${interviewCount(conversations)} customer interviews (target ${interviewMetric().target})`,
        `${pilots} on a paid pilot (target ${pilotMetric.target})`,
        `${recentDiscovery(conversations).length} discovery conversations in the last 30 days`,
      ],
    },
    { heading: "5. Discussion", body: [dana.focusQuestion] },
    { heading: "6. Homework / action items", body: ["Filled in during the meeting"] },
    { heading: "7. Schedule next meeting", body: ["Booked in Persto"] },
  ];

  return (
    <>
      <PageHeader eyebrow="Mentor Program" title="Mentor team" />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {seed.mentors.map((m) => (
          <div key={m.name} className="rounded-xl border border-line bg-paper p-4">
            <p className="font-medium text-navy">{m.name}</p>
            <p className="text-sm text-muted">{m.role}</p>
            <p className="mt-2 text-xs">{m.domain}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card
          title={`Agenda · ${formatDate(next.date)}`}
          className="lg:col-span-2"
          action={<Badge tone={shared ? "good" : "warn"}>{shared ? "Shared with mentors" : "Draft"}</Badge>}
        >
          <ol className="space-y-3">
            {agenda.map((a) => (
              <li key={a.heading}>
                <p className="text-sm font-medium">{a.heading}</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-muted">{a.body.map((b) => <li key={b}>{b}</li>)}</ul>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button onClick={() => setShared(true)} disabled={shared}>
              {shared ? "Shared" : "Share agenda with mentor team"}
            </Button>
            <LayerBadge layer="program" />
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Next meeting">
            <p className="font-serif text-2xl text-navy">{formatDate(next.date)}</p>
            <p className="mt-1 text-sm text-muted">With all three mentors</p>
            <p className="mt-3 text-xs text-muted">Booked in Persto</p>
          </Card>

          <Card title={`Last meeting · ${formatDate(last.date)}`}>
            <p className="text-xs text-muted">What they said</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{last.writeup!.said.map((s) => <li key={s}>{s}</li>)}</ul>
            <p className="mt-3 text-xs text-muted">What it changed</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{last.writeup!.changes.map((s) => <li key={s}>{s}</li>)}</ul>
            <div className="mt-3">
              <LayerBadge layer="private" />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
