import { randomBytes } from "node:crypto";
import { access, mkdir, rename, writeFile } from "node:fs/promises";
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

const exists = (abs: string) => access(abs).then(() => true, () => false);

/** "Deleting" moves the file to _archive/<original path>; a repeat archive gets a timestamp suffix. */
export async function archiveEntry(rel: string): Promise<string> {
  const from = resolveInData(rel);
  let target = `_archive/${rel}`;
  if (await exists(resolveInData(target))) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    target = `_archive/${rel.replace(/\.md$/, "")}.${stamp}.md`;
  }
  const to = resolveInData(target);
  await mkdir(path.dirname(to), { recursive: true });
  await rename(from, to);
  return target;
}
