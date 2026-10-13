import type { Program, Session } from "@/data/types";

// Generic names on purpose: licensed curricula keep their own trademarks.

const laterSession = (n: number, title: string, date: string, builds: [string, string]): Session => ({
  n,
  title,
  date,
  materials: [
    { title: `Session ${n} slides`, kind: "slides" },
    { title: `Worksheet: ${title}`, kind: "worksheet" },
  ],
  homework: [
    { id: `esc-${n}-a`, title: `Complete the worksheet: ${title}`, dueAt: date, builds: builds[0], required: 1, evidenceIds: [] },
    { id: `esc-${n}-b`, title: `Bring one question for peer feedback`, dueAt: date, builds: builds[1], required: 1, evidenceIds: [] },
  ],
  facilitatorNote: "Materials post the morning after the session.",
});

const doneSession = (n: number, title: string, date: string, items: [string, string, string, string]): Session => ({
  n,
  title,
  date,
  materials: [
    { title: `Session ${n} slides`, kind: "slides" },
    { title: `Session ${n} recording`, kind: "recording" },
    { title: `Worksheet: ${title}`, kind: "worksheet" },
  ],
  homework: [
    { id: `esc-${n}-a`, title: items[0], dueAt: date, builds: items[1], required: 1, evidenceIds: [`art-${n}-a`] },
    { id: `esc-${n}-b`, title: items[2], dueAt: date, builds: items[3], required: 1, evidenceIds: [`art-${n}-b`] },
  ],
  facilitatorNote: "",
});

export const programs: Program[] = [
  {
    id: "cdl",
    name: "Customer Discovery Lab",
    phase: "idea",
    format: "6 weeks · 2.5 hrs/week",
    description: "Learn to run unbiased customer conversations and turn them into evidence.",
    unlocks: "Application to the Early-Stage Cohort, and a head start on grant applications",
    sessions: [],
  },
  {
    id: "esc",
    name: "Early-Stage Cohort",
    phase: "early",
    format: "10 sessions · weekly · 3 hrs in person",
    description: "Facilitated cohort that takes an idea to a tested business model, ending in a pitch night.",
    unlocks: "Mentor Program team, and pitch night in front of capital partners",
    sessions: [
      doneSession(1, "Know yourself", "2026-09-15", [
        "Write your founder story (worksheet: founder story)", "Founder profile",
        "Set three milestones with a halfway check", "Milestones",
      ]),
      doneSession(2, "Understand your customer", "2026-09-22", [
        "List 20 people who have this problem", "People pipeline",
        "Draft your interview questions", "Interview guide",
      ]),
      doneSession(3, "Your solution and starting small", "2026-09-29", [
        "Map 5 alternatives customers use today", "Competitor map",
        "Define your minimum viable offer", "Venture canvas → solution",
      ]),
      doneSession(4, "Get, keep and grow customers", "2026-10-06", [
        "Write your 10-word message", "Collateral → message",
        "Pick one channel to test this week", "Assumption: channel",
      ]),
      {
        n: 5,
        title: "Revenue, pricing and distribution",
        date: "2026-10-13",
        materials: [
          { title: "Session 5 slides (posted after session)", kind: "slides" },
          { title: "Worksheet: pricing hypothesis", kind: "worksheet" },
          { title: "Reading: pricing conversations without pitching", kind: "reading" },
        ],
        homework: [
          {
            id: "esc-5-a",
            title: "Talk to 3 agency owners about how they buy and price scheduling tools",
            dueAt: "2026-10-13",
            builds: "Customer interviews metric · revenue model evidence",
            required: 3,
            evidenceIds: ["conv-13", "conv-14"],
          },
          {
            id: "esc-5-b",
            title: "Draft your pricing hypothesis (worksheet: pricing hypothesis)",
            dueAt: "2026-10-13",
            builds: "Venture canvas → revenue model",
            required: 1,
            evidenceIds: [],
          },
          {
            id: "esc-5-c",
            title: "Halfway check: review your three milestones and name the one that's behind",
            dueAt: "2026-10-13",
            builds: "Milestones → halfway check",
            required: 1,
            evidenceIds: [],
          },
        ],
        facilitatorNote:
          "Halfway week. Come ready to say which milestone is behind and what you'll change. No judgment, just honesty.",
      },
      laterSession(6, "Legal and accounting", "2026-10-20", ["Company facts", "Records"]),
      laterSession(7, "Costs and break-even", "2026-10-27", ["Financials → costs", "Assumption: break-even"]),
      laterSession(8, "Financials and capital", "2026-11-03", ["Funding history", "Capital readiness"]),
      laterSession(9, "Growth plan and goals", "2026-11-10", ["Milestones → next 12 months", "Use of funds"]),
      laterSession(10, "Pitch night", "2026-11-17", ["Pitch (versioned)", "Capital readiness"]),
    ],
  },
  {
    id: "mentor",
    name: "Mentor Program",
    phase: "validation",
    format: "Team of 3–5 volunteer mentors · monthly meetings",
    description: "A standing mentor team. Meetings are scheduled in Persto; agendas and write-ups live here.",
    unlocks: "Warm introductions to capital partners when your readiness profile is shared",
    sessions: [],
  },
  {
    id: "capital",
    name: "Capital Readiness",
    phase: "capital",
    format: "Pitch practice · founders & funders events · annual summit",
    description: "Pitch practice and curated introductions to partner funds, grants and pitch events.",
    unlocks: "Curated introductions to partner funds",
    sessions: [],
  },
];

/** Non-conversation evidence attached to homework (worksheets, files, canvas versions). */
export const artifacts: Record<string, string> = {
  "art-1-a": "Founder story v1",
  "art-1-b": "Milestones (3) with halfway checks",
  "art-2-a": "People list: 24 agency owners and schedulers",
  "art-2-b": "Interview guide v2",
  "art-3-a": "Competitor map: 5 alternatives",
  "art-3-b": "Minimum viable offer: shift-swap board",
  "art-4-a": "Message: “Fill every shift without the 6am text chain.”",
  "art-4-b": "Channel test: state home-care association newsletter",
};
