import type { CanvasStatus } from "../store/schemas";

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
