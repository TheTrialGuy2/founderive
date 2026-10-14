import { describe, expect, it } from "vitest";
import type { DueItem } from "./due";
import { homeAction } from "./home";
import type { PathStep, PathView } from "./path";

const step = (over: Partial<PathStep> = {}): PathStep => ({ id: "problem", title: "Problem", meaning: "", doneWhen: "", done: false, doneOn: null, doneReason: null, discussed: 0, tested: false, planned: 0, href: "/path/problem", ...over });
const path = (current: PathStep | null, allDone = false): PathView => ({ steps: current ? [current] : [], current, doneCount: 0, total: 1, allDone });
const item = (due: string | null): DueItem => ({ key: "commitment:2026-W42:c-1", kind: "commitment", id: "c-1", text: "Call Dana", due, week: "2026-W42" });
const base = { today: "2026-10-14", risk: null, outcome: "Talk to three people", blocker: null, due: [] as DueItem[], importedWaiting: 0, path: path(step()) };

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
  it("picks the earliest past-due item even when the list isn't sorted", () => {
    const late = (text: string, due: string): DueItem => ({ ...item(due), key: text, text });
    const a = homeAction({ ...base, due: [late("Later", "2026-10-12"), late("Earliest", "2026-10-02"), late("Middle", "2026-10-08")] });
    expect(a).toMatchObject({ kind: "overdue", label: "Earliest", key: "Earliest" });
  });
  it("counts a follow-up past its date as the main action", () => {
    const f: DueItem = { key: "followup:c.md#f-1", kind: "followup", id: "c.md#f-1", text: "Follow up with Dana: send the price", due: "2026-10-12", week: null, href: "/conversations/c" };
    expect(homeAction({ ...base, due: [f] })).toMatchObject({ kind: "overdue", key: "followup:c.md#f-1" });
  });
  it("then the current step: on Customer, the concrete conversation move", () => {
    const customer = (over: Partial<PathStep> = {}) => path(step({ id: "customer", title: "Customer", href: "/path/customer", ...over }));
    expect(homeAction({ ...base, path: customer() })).toMatchObject({ kind: "step", mode: "plan", label: "Continue: plan a conversation about Customer", href: "/path/customer" });
    expect(homeAction({ ...base, path: customer({ planned: 1 }) })).toMatchObject({ mode: "log", label: "Continue: log your conversation about Customer" });
    expect(homeAction({ ...base, path: customer({ discussed: 2 }) })).toMatchObject({ mode: "open", label: "Continue: Customer" });
  });
  it("on any other step, opens it to work on the answer, whatever was discussed or planned", () => {
    for (const over of [{}, { planned: 1 }, { discussed: 2 }]) {
      expect(homeAction({ ...base, path: path(step(over)) })).toMatchObject({ kind: "step", mode: "open", label: "Continue: Problem", reason: "Work on your answer, then mark it done.", href: "/path/problem", stepId: "problem" });
    }
  });
  it("asks to review imported conversations after anything past its date and before the step", () => {
    expect(homeAction({ ...base, importedWaiting: 3, due: [item("2026-10-08")] })?.kind).toBe("overdue");
    expect(homeAction({ ...base, importedWaiting: 3, blocker: "No intros" })?.kind).toBe("blocker");
    expect(homeAction({ ...base, importedWaiting: 3 })).toEqual({ kind: "imports", label: "Review 3 imported conversations", reason: "Imported conversations don't count until you confirm them.", href: "/people?show=imported" });
    expect(homeAction({ ...base, importedWaiting: 1 })?.label).toBe("Review 1 imported conversation");
    expect(homeAction({ ...base, importedWaiting: 2, path: path(null, true) })?.kind).toBe("imports");
  });
  it("asks to choose a focus when every step is done", () => {
    expect(homeAction({ ...base, path: path(null, true) })).toMatchObject({ kind: "focus", label: "Choose this week's focus" });
  });
});
