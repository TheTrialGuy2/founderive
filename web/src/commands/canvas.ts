import { applyBlockSave, canvasBlocks, confirmImport, type CanvasBlockDef } from "../core/canvas";
import { listEntries, readEntry, type Entry } from "../store/read";
import { CANVAS_STATUSES, type KindData } from "../store/schemas";
import { updateEntry } from "../store/update";
import { oneOf, required } from "./form";

export type CanvasBlock = KindData<"canvasBlock">;
export type CanvasCard = { def: CanvasBlockDef; block: CanvasBlock | null; notes: string; flagged: { path: string; error: string } | null };

export const CANVAS_CONFIG = "canvas/blocks.md";
export const blockPath = (id: string) => `canvas/${id}.md`;

/** The block list: the founder's canvas/blocks.md, or the shipped default (also used while that file can't be read). */
export async function loadCanvasDefs(): Promise<{ defs: CanvasBlockDef[]; source: "default" | "founder"; configError: { path: string; error: string } | null }> {
  const entry = await readEntry("canvasConfig", CANVAS_CONFIG);
  if (entry && !entry.ok) return { defs: canvasBlocks(null), source: "default", configError: { path: entry.path, error: entry.error } };
  return { defs: canvasBlocks(entry?.ok ? entry.data : null), source: entry?.ok ? "founder" : "default", configError: null };
}

function cardFor(def: CanvasBlockDef, entry: Entry<"canvasBlock"> | null): CanvasCard {
  if (!entry) return { def, block: null, notes: "", flagged: null };
  if (!entry.ok) return { def, block: null, notes: "", flagged: { path: entry.path, error: entry.error } };
  if (entry.data.id !== def.id) return { def, block: null, notes: "", flagged: { path: entry.path, error: `id: says "${entry.data.id}", but the file is ${def.id}.md` } };
  return { def, block: entry.data, notes: entry.body.trim(), flagged: null };
}

/** Every block in list order, plus block files that aren't in the list (shown, never dropped). */
export async function loadCanvas(): Promise<{
  cards: CanvasCard[];
  source: "default" | "founder";
  configError: { path: string; error: string } | null;
  others: { path: string; error: string }[];
}> {
  const { defs, source, configError } = await loadCanvasDefs();
  const entries = await listEntries("canvasBlock");
  const byPath = new Map(entries.map((e) => [e.path, e]));
  const listed = new Set(defs.map((d) => blockPath(d.id)));
  const others = entries
    .filter((e) => !listed.has(e.path))
    .map((e) => ({ path: e.path, error: e.ok ? `"${e.data.id}" isn't in your canvas list (canvas/blocks.md), so it isn't shown.` : e.error }));
  return { cards: defs.map((def) => cardFor(def, byPath.get(blockPath(def.id)) ?? null)), source, configError, others };
}

export async function loadCanvasBlock(id: string): Promise<{ status: "missing" } | ({ status: "ready" } & CanvasCard)> {
  const { defs } = await loadCanvasDefs();
  const def = defs.find((d) => d.id === id);
  if (!def) return { status: "missing" };
  return { status: "ready", ...cardFor(def, await readEntry("canvasBlock", blockPath(id))) };
}

/** Saves the founder's current belief for one block. Changed wording goes to history; unknown block ids are refused. */
export async function saveCanvasBlock(id: string, input: { text: string; status: string; notes?: string }, today: string): Promise<void> {
  const { defs } = await loadCanvasDefs();
  if (!defs.some((d) => d.id === id)) throw new Error(`"${id}" isn't a block in your canvas. Reload the page.`);
  const text = required(input.text, "Write your current belief, even a rough guess.");
  if (!oneOf(CANVAS_STATUSES, input.status)) throw new Error("Pick how tested this belief is.");
  const status = input.status;
  await updateEntry("canvasBlock", blockPath(id), (data, body) => ({
    data: applyBlockSave(data, id, { text, status }, today),
    body: input.notes === undefined ? body : input.notes.trim() ? `${input.notes.trim()}\n` : "",
  }));
}

/** The founder accepts an imported block's text as their own. */
export async function confirmImported(id: string): Promise<void> {
  await updateEntry("canvasBlock", blockPath(id), (data, body) => {
    if (!data) throw new Error(`founder-data/${blockPath(id)} isn't there anymore. Reload the page.`);
    return { data: confirmImport(data), body };
  });
}
