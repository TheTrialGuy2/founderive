import { describe, expect, it } from "vitest";
import type { DueItem } from "./due";
import { homeAction } from "./home";
import type { PathStep, PathView } from "./path";

const step = (over: Partial<PathStep> = {}): PathStep => ({ id: "problem", title: "Problem", meaning: "", doneWhen: "", done: false, doneOn: null, doneReason: null, discussed: 0, tested: false, planned: 0, href: "/path/problem", ...over });
const path = (current: PathStep | null, allDone = false): PathView => ({ steps: current ? [current] : [], current, doneCount: 0, total: 1, allDone });
const item = (due: string | null): DueItem => ({ key: "commitment:2026-W42:c-1", kind: "commitment", id: "c-1", text: "Call Dana", due, week: "2026-W42" });
const base = { today: "2026-10-14", risk: null, outcome: "Talk to three people", blocker: null, due: [] as DueItem[], path: path(step()) };

describe("homeAction", () => {
  it("puts a risk first", () => {
    expect(homeAction({ ...base, outcome: null, risk: { label: "Renew the license", reason: "It lapses Friday.", href: "/x" } })?.kind).toBe("risk");
  });
  it("asks for the week's outcome before anything else", () => {
    expect(homeAction({ ...base, outcome: null, due: [item("2026-10-01")] })).toMatchObject({ kind: "outcome", label: "Set this week's outcome" });
  });
  it("names a blocker next", () => {
    expect(homeAction({ ...base, blocker: "No intros" })?.kind).toBe("blocker");
  });
  it("then the earliest item past its date, in words", () => {
    const a = homeAction({ ...base, due: [item("2026-10-16"), item("2026-10-08")] });
    expect(a).toMatchObject({ kind: "overdue", label: "Call Dana" });
    expect(a?.reason).toMatch(/from last week/);
    expect(a?.reason).not.toMatch(/overdue/i);
  });
  it("then the current step, with the concrete next move", () => {
    expect(homeAction(base)).toMatchObject({ kind: "step", mode: "plan", label: "Continue: plan a conversation about Problem", href: "/path/problem" });
    expect(homeAction({ ...base, path: path(step({ planned: 1 })) })).toMatchObject({ mode: "log", label: "Continue: log your conversation about Problem" });
    expect(homeAction({ ...base, path: path(step({ discussed: 2 })) })).toMatchObject({ mode: "open", label: "Continue: Problem" });
  });
  it("asks to choose a focus when every step is done", () => {
    expect(homeAction({ ...base, path: path(null, true) })).toMatchObject({ kind: "focus", label: "Choose this week's focus" });
  });
});
