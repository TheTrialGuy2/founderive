import { readFile } from "node:fs/promises";
import { resolveInData } from "./paths";
import { parseEntry } from "./read";
import { KINDS, type Kind, type KindData } from "./schemas";
import { saveEntry, ValidationError } from "./write";

export type Change<K extends Kind> = (
  data: KindData<K> | null,
  body: string,
) => { data: KindData<K>; body: string } | Promise<{ data: KindData<K>; body: string }>;

const MAX_ATTEMPTS = 3;
const queues = new Map<string, Promise<unknown>>();

/** Runs `work` after every earlier call for the same file has finished (an in-process mutex per file). */
async function serialized<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const run = previous.then(work, work);
  const tail = run.catch(() => undefined);
  queues.set(key, tail);
  try {
    return await run;
  } finally {
    if (queues.get(key) === tail) queues.delete(key);
  }
}

async function readRaw(abs: string): Promise<string | null> {
  try {
    return await readFile(abs, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Read-change-write without lost updates. Calls for the same file run one at a time, and if the file
 * changes on disk between the read and the write (an agent or editor saved it), the change is reapplied
 * to the new contents, up to three attempts. `change` gets null when the file doesn't exist yet and may
 * run more than once, so it must only depend on what it's given.
 */
export async function updateEntry<K extends Kind>(kind: K, rel: string, change: Change<K>): Promise<{ data: KindData<K>; body: string }> {
  if (!KINDS[kind].pattern.test(rel)) throw new ValidationError(`${rel} is not a valid path for ${kind}`);
  const abs = resolveInData(rel);
  return serialized(abs, async () => {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const before = await readRaw(abs);
      let current: { data: KindData<K>; body: string } | null = null;
      if (before !== null) {
        const entry = parseEntry(kind, rel, before);
        if (!entry.ok) throw new Error(`Fix founder-data/${rel} first: ${entry.error}`);
        current = { data: entry.data, body: entry.body };
      }
      const next = await change(current ? current.data : null, current ? current.body : "");
      if ((await readRaw(abs)) !== before) continue;
      await saveEntry(kind, rel, next.data, next.body);
      return next;
    }
    throw new Error(`founder-data/${rel} changed while saving. Try again.`);
  });
}
