import { describe, expect, it } from "vitest";
import { listPrograms, seed } from "@/data/repo";
import { interviewCount, interviewStreak, nextAction, programSteps, readinessRows, recentDiscovery } from "./derived";

describe("storyline numbers from seed data", () => {
  it("counts 13 interviews (the family conversation is excluded)", () => {
    expect(interviewCount(seed.conversations)).toBe(13);
  });

  it("has 3 recent discovery conversations, so Momentum starts partial", () => {
    expect(recentDiscovery(seed.conversations)).toHaveLength(3);
    expect(readinessRows(seed.conversations).find((r) => r.key === "momentum")?.status).toBe("partial");
  });

  it("has 8 of 21 cohort steps done", () => {
    expect(programSteps(listPrograms(), "esc")).toEqual({ done: 8, total: 21 });
  });

  it("starts on a 2-week interview streak (this week not done yet)", () => {
    expect(interviewStreak(seed.conversations).streak).toBe(2);
  });
});

describe("nextAction", () => {
  const programs = () => structuredClone(listPrograms());
  const base = () => ({ conversations: seed.conversations, programs: programs(), optIns: [] as string[] });

  it("starts with the open interview homework", () => {
    const a = nextAction(base());
    expect(a.title).toMatch(/agency owner/i);
    expect(a.href).toBe("/founder/conversations/new");
  });

  it("moves to the halfway check once interviews are done", () => {
    const s = base();
    const hw = s.programs.find((p) => p.id === "esc")!.sessions[4].homework.find((h) => h.id === "esc-5-a")!;
    hw.evidenceIds = ["a", "b", "c"];
    expect(nextAction(s).title).toMatch(/halfway/i);
  });

  it("then points at sharing a readiness profile, and stops once shared", () => {
    const s = base();
    for (const h of s.programs.find((p) => p.id === "esc")!.sessions[4].homework) h.evidenceIds = Array(h.required).fill("x");
    // Momentum needs a 4th recent interview before any partner bar (3 supported) is met.
    const convs = [...seed.conversations, { ...seed.conversations[13], id: "new", occurredAt: "2026-10-12" }];
    expect(nextAction({ ...s, conversations: convs }).title).toMatch(/readiness profile/i);
    expect(nextAction({ ...s, conversations: convs, optIns: ["micro"] }).title).toMatch(/mentor/i);
  });
});
