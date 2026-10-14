import { applyBlockSave, canvasBlocks, confirmImport, type CanvasBlockDef } from "../core/canvas";
import { slugOf } from "../core/slug";
import { listEntries, readEntry, type Entry } from "../store/read";
import { CANVAS_STATUSES, type ConversationType, type KindData, type TestStatus } from "../store/schemas";
import { updateEntry } from "../store/update";
import { createEntryIfAbsent } from "../store/write";
import type { RecordMeta } from "./create";
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

export type BlockEvidence = {
  tests: { slug: string; title: string; status: TestStatus }[];
  conversations: { slug: string; label: string; type: ConversationType; date: string | null }[];
};

/** Tests and conversations tagged with this block. */
export async function loadBlockEvidence(id: string): Promise<BlockEvidence> {
  const [tests, conversations] = await Promise.all([listEntries("test"), listEntries("conversation")]);
  return {
    tests: tests.flatMap((t) => (t.ok && t.data.area === id ? [{ slug: slugOf(t.path), title: t.data.title, status: t.data.status }] : [])),
    conversations: conversations
      .flatMap((c) =>
        c.ok && c.data.areas.includes(id)
          ? [{ slug: slugOf(c.path), label: c.data.org ? `${c.data.person} · ${c.data.org}` : c.data.person, type: c.data.type, date: c.data.date ?? null }]
          : [],
      )
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
  };
}

/** The founder accepts an imported block's text as their own. */
export async function confirmImported(id: string): Promise<void> {
  await updateEntry("canvasBlock", blockPath(id), (data, body) => {
    if (!data) throw new Error(`founder-data/${blockPath(id)} isn't there anymore. Reload the page.`);
    return { data: confirmImport(data), body };
  });
}

class AlreadyWritten extends Error {}

/**
 * Brings in a block's text from an import, as a draft marked seeded. Never overwrites: a block that already has text
 * is left exactly as it is (the file isn't rewritten) and its current source is handed back so the caller can tell
 * its own earlier import from the founder's writing. A block file with no text yet is filled through the same save
 * as the founder's edit (status and history kept), then marked seeded. An unreadable block file is refused.
 */
export async function importCanvasBlock(id: string, text: string, meta: RecordMeta, today: string): Promise<{ status: "created" } | { status: "exists"; source: string | null }> {
  const { defs } = await loadCanvasDefs();
  if (!defs.some((d) => d.id === id)) throw new Error(`"${id}" isn't a block in your canvas.`);
  const belief = required(text, "The imported block has no text.");
  const rel = blockPath(id);
  const exists = async () => {
    const e = await readEntry("canvasBlock", rel);
    return { status: "exists" as const, source: e?.ok ? (e.data.source ?? null) : null };
  };
  const entry = await readEntry("canvasBlock", rel);
  if (entry && !entry.ok) throw new Error(`Fix founder-data/${rel} first: ${entry.error}`);
  if (entry?.ok && entry.data.text.trim()) return exists();
  if (!entry) {
    const data = { ...applyBlockSave(null, id, { text: belief, status: "untested" }, today), ...meta };
    return (await createEntryIfAbsent("canvasBlock", rel, data)) ? { status: "created" } : exists();
  }
  try {
    await updateEntry("canvasBlock", rel, (data, body) => {
      if (!data || data.text.trim()) throw new AlreadyWritten();
      return { data: { ...applyBlockSave(data, id, { text: belief, status: data.status }, today), ...meta }, body };
    });
    return { status: "created" };
  } catch (error) {
    if (error instanceof AlreadyWritten) return exists();
    throw error;
  }
}
