import { describe, expect, it } from "vitest";
import { operatorView } from "./visibility";
import type { FounderRecord } from "@/data/types";

const SECRET = "SECRET-PRIVATE-VALUE";

const record: FounderRecord = {
  founder: {
    id: "f1",
    name: "Pat Lee",
    ventureName: "Acme",
    oneLiner: "Widgets",
    city: "Charlotte",
    phase: "early",
    ventureType: "growth",
    cohortId: "c1",
    programIds: ["p1"],
    completedProgramIds: [],
    lastActivity: "2026-10-10",
    focusQuestion: SECRET,
    profile: [
      { key: "why", question: "Why?", answer: "Shared reason", layer: "program" },
      { key: "limit", question: "Limitation?", answer: SECRET, layer: "private" },
    ],
  },
  conversations: [
    {
      id: "c",
      founderId: "f1",
      type: "customer_discovery",
      with: SECRET,
      org: SECRET,
      relationship: "cold",
      occurredAt: "2026-10-01",
      newFact: SECRET,
      whatThisChanges: [SECRET],
      quotes: [SECRET],
      numbers: [],
      contaminationFlags: [],
      followUps: [],
    },
  ],
  contacts: [SECRET],
  notes: [SECRET],
  finances: [{ label: "Bank balance", value: SECRET }],
  programProgress: { programId: "p1", stepsDone: 4, stepsTotal: 10 },
  mentorMeetings: [
    { id: "m1", date: "2026-10-01", status: "held", writeup: { said: [SECRET], homework: [SECRET], changes: [SECRET] } },
  ],
  reported: [{ key: "customers", label: "Customers", value: "3", source: "record", verification: "self_reported" }],
};

describe("operatorView", () => {
  it("never carries a Private value anywhere in the output", () => {
    expect(JSON.stringify(operatorView(record))).not.toContain(SECRET);
  });

  it("keeps Program-layer profile answers and Reported fields", () => {
    const view = operatorView(record);
    expect(view.profile.map((p) => p.key)).toEqual(["why"]);
    expect(view.reported).toHaveLength(1);
    expect(view.programProgress.stepsDone).toBe(4);
  });

  it("lists what is locked so the UI can show the boundary", () => {
    expect(operatorView(record).lockedSections).toEqual(["Conversations", "Contacts", "Notes", "Finances", "Mentor write-ups"]);
  });
});
