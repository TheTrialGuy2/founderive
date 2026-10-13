import type { CanvasStatus, KindData } from "../store/schemas";

export type CanvasBlockDef = { id: string; title: string; prompt: string };
type CanvasBlock = KindData<"canvasBlock">;

// Generic blocks in Founderive's own words, matching the venture-test areas plus alternatives and advantage.
// A founder's canvas/blocks.md replaces this list entirely.
export const DEFAULT_CANVAS: CanvasBlockDef[] = [
  { id: "customer", title: "Customer", prompt: "Who has the problem most sharply? Describe one specific kind of customer." },
  { id: "problem", title: "Problem", prompt: "What problem do they have, and how do they feel it today?" },
  { id: "solution", title: "Solution", prompt: "What will you offer, in plain words? Keep it to what solves the problem." },
  { id: "alternatives", title: "Alternatives", prompt: "What do they use or do today instead, including doing nothing?" },
  { id: "advantage", title: "Advantage", prompt: "Why would they choose you over those alternatives?" },
  { id: "channel", title: "Channel", prompt: "How will you reach these customers and make the sale?" },
  { id: "revenue", title: "Revenue", prompt: "What will they pay, for what unit, and how often?" },
  { id: "cost", title: "Cost", prompt: "What does it cost to deliver one sale, and to keep going each month?" },
  { id: "feasibility", title: "Feasibility", prompt: "What must be true for you to deliver this? What could stop you?" },
];

/** The founder's own block list when they have one, otherwise the shipped default. */
export function canvasBlocks(config: { blocks: CanvasBlockDef[] } | null): CanvasBlockDef[] {
  return config && config.blocks.length > 0 ? config.blocks : DEFAULT_CANVAS;
}

/**
 * The block after the founder saves it. Changed wording pushes the previous text, dated with its last save, onto
 * history, so no wording is ever lost. Saving is the founder's own edit, so an imported block stops being "seeded".
 */
export function applyBlockSave(current: CanvasBlock | null, id: string, input: { text: string; status: CanvasStatus }, today: string): CanvasBlock {
  const base: CanvasBlock = current ?? { id, text: "", status: "untested", history: [] };
  const changed = base.text.trim() !== input.text.trim();
  const history = changed && base.text.trim() ? [...base.history, { date: base.updated ?? today, text: base.text }] : base.history;
  const next: CanvasBlock = { ...base, text: input.text, status: input.status, updated: today, history };
  delete next.seeded;
  return next;
}

/** The founder accepts imported text as their own. */
export function confirmImport(block: CanvasBlock): CanvasBlock {
  const next: CanvasBlock = { ...block };
  delete next.seeded;
  return next;
}
