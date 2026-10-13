import { datedPath } from "../core/slug";
import type { Kind, KindData } from "../store/schemas";
import { createEntryIfAbsent } from "../store/write";

/** Declared metadata an import sets: a draft the founder hasn't confirmed yet, and where it came from. */
export type RecordMeta = { seeded?: boolean; source?: string };

/** Creates `<dir>/<date>-<slug>.md`, adding -2, -3 … when that name is taken. Never overwrites. Returns the path. */
export async function createDated<K extends Kind>(kind: K, dir: string, date: string, title: string, data: KindData<K>, body = ""): Promise<string> {
  for (let attempt = 1; attempt <= 50; attempt++) {
    const rel = datedPath(dir, date, title, attempt);
    if (await createEntryIfAbsent(kind, rel, data, body)) return rel;
  }
  throw new Error(`Couldn't find a free file name in founder-data/${dir}/ for "${title}".`);
}
