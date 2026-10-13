"use client";

import Link from "next/link";
import { useState } from "react";
import { Builds, Button, Card, PageHeader, formatDate } from "@/components/ui";
import { useDemo } from "@/state/DemoStore";

const RECORD_PARTS = [
  "Customer interviews metric",
  "Venture canvas → revenue model",
  "Milestones",
  "Company facts",
  "Funding history",
  "Capital readiness",
  "Pitch (versioned)",
];

export function BuilderView({ programId }: { programId: string }) {
  const { programs, addHomework, removeHomework } = useDemo();
  const program = programs.find((p) => p.id === programId)!;
  const [selected, setSelected] = useState(5);
  const [title, setTitle] = useState("");
  const [builds, setBuilds] = useState(RECORD_PARTS[0]);
  const session = program.sessions.find((s) => s.n === selected)!;

  const add = () => {
    if (!title.trim()) return;
    addHomework(programId, selected, { title: title.trim(), builds, dueAt: session.date, required: 1 });
    setTitle("");
  };

  return (
    <>
      <PageHeader eyebrow="Program builder" title={program.name} />

      <div className="grid gap-5 lg:grid-cols-4">
        <nav className="space-y-1">
          {program.sessions.map((s) => (
            <button
              key={s.n}
              onClick={() => setSelected(s.n)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${s.n === selected ? "bg-navy text-white" : "hover:bg-sand/60"}`}
            >
              <span className="text-xs opacity-70">{formatDate(s.date)}</span>
              <br />
              {s.n}. {s.title}
            </button>
          ))}
        </nav>

        <div className="space-y-5 lg:col-span-3">
          <Card
            title={`Session ${session.n}: ${session.title}`}
            action={
              <Link href={`/demo/founder/programs/${programId}/sessions/${session.n}`} className="text-sm text-navy underline">
                Preview as founder
              </Link>
            }
          >
            <p className="mb-2 text-xs text-muted">Materials</p>
            <ul className="mb-5 list-disc pl-5 text-sm">
              {session.materials.map((m) => (
                <li key={m.title}>{m.title}</li>
              ))}
            </ul>

            <p className="mb-2 text-xs text-muted">Homework</p>
            <ul className="space-y-2">
              {session.homework.map((h) => (
                <li key={h.id} className="flex items-start justify-between gap-3 rounded-lg border border-line p-3">
                  <div>
                    <p className="text-sm">{h.title}</p>
                    <div className="mt-1">
                      <Builds>{h.builds}</Builds>
                    </div>
                  </div>
                  <button onClick={() => removeHomework(programId, session.n, h.id)} className="text-xs text-muted underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Add homework">
            <div className="grid gap-3 md:grid-cols-[1fr_16rem_auto] md:items-end">
              <label className="text-sm">
                <span className="text-muted">What founders do</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ask 2 customers what they pay today"
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-muted">Builds which part of their record</span>
                <select value={builds} onChange={(e) => setBuilds(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2">
                  {RECORD_PARTS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <Button onClick={add} disabled={!title.trim()}>
                Publish
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
