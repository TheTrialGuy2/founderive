import { readFile } from "node:fs/promises";
import { parseFrontmatter } from "./frontmatter";
import { resolveInData } from "./paths";
import { formatIssues, KINDS, kindOf, type Kind, type KindData } from "./schemas";
import { walkMarkdown } from "./walk";

export type Entry<K extends Kind> =
  | { ok: true; kind: K; path: string; data: KindData<K>; body: string }
  | { ok: false; kind: K; path: string; error: string; /** The file says `seeded: true` though it doesn't pass its schema: an import that needs fixing. */ seeded?: boolean };

export function parseEntry<K extends Kind>(kind: K, rel: string, text: string): Entry<K> {
  let parsed: { data: unknown; body: string };
  try {
    parsed = parseFrontmatter(text);
  } catch (error) {
    return { ok: false, kind, path: rel, error: `YAML: ${(error as Error).message.split("\n")[0]}` };
  }
  const result = KINDS[kind].schema.safeParse(parsed.data);
  if (!result.success) {
    const seeded = typeof parsed.data === "object" && parsed.data !== null && (parsed.data as { seeded?: unknown }).seeded === true;
    return { ok: false, kind, path: rel, error: formatIssues(result.error), ...(seeded ? { seeded } : {}) };
  }
  return { ok: true, kind, path: rel, data: result.data as KindData<K>, body: parsed.body };
}

/** Reads one entry. Returns null when the file doesn't exist, and a flagged entry when it's invalid. */
export async function readEntry<K extends Kind>(kind: K, rel: string): Promise<Entry<K> | null> {
  if (!KINDS[kind].pattern.test(rel)) return { ok: false, kind, path: rel, error: `${rel} is not a valid path for ${kind}` };
  let text: string;
  try {
    text = await readFile(resolveInData(rel), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  return parseEntry(kind, rel, text);
}

export async function listEntries<K extends Kind>(kind: K): Promise<Entry<K>[]> {
  const rels = (await walkMarkdown()).filter((rel) => kindOf(rel) === kind);
  const entries = await Promise.all(rels.map((rel) => readEntry(kind, rel)));
  return entries.filter((e): e is Entry<K> => e !== null);
}

/** Every live Markdown path in founder-data (_archive and _reference are skipped), for checking links. */
export async function existingPaths(): Promise<Set<string>> {
  return new Set(await walkMarkdown());
}
