import { randomBytes } from "node:crypto";
import { link, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { stringifyFrontmatter } from "./frontmatter";
import { resolveInData } from "./paths";
import { formatIssues, KINDS, type Kind, type KindData } from "./schemas";

export class ValidationError extends Error {}

/** Writes via a temp file + rename in the same folder, so a crash never leaves a half-written entry. */
export async function writeFileAtomic(rel: string, content: string): Promise<void> {
  const abs = resolveInData(rel);
  await mkdir(path.dirname(abs), { recursive: true });
  const tmp = path.join(path.dirname(abs), `.${path.basename(abs)}.${randomBytes(4).toString("hex")}.tmp`);
  await writeFile(tmp, content, "utf8");
  await rename(tmp, abs);
}

export async function saveEntry<K extends Kind>(kind: K, rel: string, data: KindData<K>, body = ""): Promise<void> {
  if (!KINDS[kind].pattern.test(rel)) throw new ValidationError(`${rel} is not a valid path for ${kind}`);
  const result = KINDS[kind].schema.safeParse(data);
  if (!result.success) throw new ValidationError(formatIssues(result.error));
  await writeFileAtomic(rel, stringifyFrontmatter(result.data as Record<string, unknown>, body));
}

/**
 * Creates an entry only if `rel` doesn't already exist; an existing file is left untouched (no read-then-write
 * race: a temp file is written first, then linked into place, so a destination created after any existence
 * check a caller made is still not overwritten). Returns whether it created the file.
 */
export async function createEntryIfAbsent<K extends Kind>(kind: K, rel: string, data: KindData<K>, body = ""): Promise<boolean> {
  if (!KINDS[kind].pattern.test(rel)) throw new ValidationError(`${rel} is not a valid path for ${kind}`);
  const result = KINDS[kind].schema.safeParse(data);
  if (!result.success) throw new ValidationError(formatIssues(result.error));
  const abs = resolveInData(rel);
  await mkdir(path.dirname(abs), { recursive: true });
  const tmp = path.join(path.dirname(abs), `.${path.basename(abs)}.${randomBytes(4).toString("hex")}.tmp`);
  await writeFile(tmp, stringifyFrontmatter(result.data as Record<string, unknown>, body), "utf8");
  try {
    await link(tmp, abs);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw err;
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

/** "Deleting" moves the file to _archive/<original path>; a repeat archive gets a timestamp suffix (atomic, no overwrite). */
export async function archiveEntry(rel: string): Promise<string> {
  const from = resolveInData(rel);
  let target = `_archive/${rel}`;

  // Try atomic link first; if target exists, retry with timestamp + random suffix
  for (let attempt = 0; attempt < 5; attempt++) {
    const to = resolveInData(target);
    await mkdir(path.dirname(to), { recursive: true });
    try {
      await link(from, to);
      // Successfully linked; now delete the original
      try {
        await unlink(from);
      } catch (unlinkErr) {
        // If unlink fails, remove the link we just created and rethrow
        await unlink(to).catch(() => {});
        throw unlinkErr;
      }
      return target;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      // Generate a new timestamped path for the next attempt
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const suffix = randomBytes(2).toString("hex");
      target = `_archive/${rel.replace(/\.md$/, "")}.${stamp}-${suffix}.md`;
    }
  }
  throw new Error(`Failed to archive ${rel} after 5 attempts`);
}
