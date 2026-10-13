import type { Area, CanvasStatus, ConversationType, EvidenceStrength, TestDecision, TestResult, TestStatus } from "../store/schemas";

/** [value, label] pairs in declaration order, for radios and selects. */
export function options<K extends string>(labels: Record<K, string>): [K, string][] {
  return Object.entries(labels) as [K, string][];
}

export const CANVAS_STATUS_LABELS: Record<CanvasStatus, string> = { untested: "Untested", "some-evidence": "Some evidence", tested: "Tested" };
export const CANVAS_STATUS_HELP: Record<CanvasStatus, string> = {
  untested: "A belief you haven't checked yet.",
  "some-evidence": "Some conversations or results point this way.",
  tested: "A completed test supports or contradicts it.",
};

export const TYPE_LABELS: Record<ConversationType, string> = { customer: "Customer", prospect: "Prospect", mentor: "Mentor", partner: "Partner", investor: "Investor", other: "Other" };
export const AREA_LABELS: Record<Area, string> = {
  customer: "Customer",
  problem: "Problem",
  solution: "Solution",
  channel: "Channel",
  revenue: "Revenue",
  cost: "Cost",
  feasibility: "Feasibility",
};
export const STATUS_LABELS: Record<TestStatus, string> = { planned: "Planned", running: "Running", complete: "Complete", abandoned: "Stopped early" };
export const RESULT_LABELS: Record<TestResult, string> = { supported: "Supported", contradicted: "Contradicted", inconclusive: "Inconclusive" };
export const RESULT_HELP: Record<TestResult, string> = {
  supported: "Your success criteria were met.",
  contradicted: "Your failure criteria were met.",
  inconclusive: "Not enough signal either way. That's a fine answer.",
};
export const DECISION_LABELS: Record<TestDecision, string> = { continue: "Continue", revise: "Revise", pause: "Pause", stop: "Stop" };
export const DECISION_HELP: Record<TestDecision, string> = {
  continue: "Keep going on this belief.",
  revise: "Change the belief, offer or customer, and test again.",
  pause: "Set it aside for now.",
  stop: "Drop this direction. Stopping on evidence is progress.",
};
export const STRENGTH_LABELS: Record<EvidenceStrength, string> = { none: "None yet", weak: "Weak", moderate: "Moderate", strong: "Strong" };
export const STRENGTH_GUIDE =
  "Paid beats behavior, and behavior beats opinion: money or a signed commitment is strong, something people did is moderate, and what people said is weak. Advice from mentors, investors or partners doesn't count.";
