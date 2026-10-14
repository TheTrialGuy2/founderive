import { randomBytes } from "node:crypto";
import { access, link, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOGO_MAX_BYTES, LOGO_TOO_BIG_MESSAGE } from "../core/logo";
import { localISODate } from "../core/today";
import { resolveInData } from "./paths";
import { ValidationError } from "./write";

export { LOGO_MAX_BYTES, ValidationError };

/** A founder's logo, up to 1 MB, sniffed by its real bytes rather than trusted by name or extension. */
export type LogoExt = "png" | "jpg" | "webp";
const EXTS: readonly LogoExt[] = ["png", "jpg", "webp"];
const CONTENT_TYPES: Record<LogoExt, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

const UNSUPPORTED_MESSAGE = "That doesn't look like a PNG, JPG or WebP image, so it can't be used as a logo. SVG and other file types aren't supported.";
const TOO_BIG_MESSAGE = LOGO_TOO_BIG_MESSAGE;

/** Filesystem error codes where a hard link can't be made (e.g. founder-data lives on another volume) but a plain rename still can. */
const LINK_UNSUPPORTED_CODES = new Set(["EPERM", "ENOTSUP", "EXDEV"]);

/** Sniffs the real file type from its first bytes. Never trusts a file name or a declared content type. */
export function detectLogoExt(bytes: Uint8Array): LogoExt | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "webp";
  return null;
}

/** The live logo file, if any (brand/logo.<ext>), found by probing each extension since the store doesn't read founder.md. */
async function existingLogo(): Promise<{ rel: string; ext: LogoExt } | null> {
  for (const ext of EXTS) {
    const rel = `brand/logo.${ext}`;
    const found = await access(resolveInData(rel)).then(() => true, () => false);
    if (found) return { rel, ext };
  }
  return null;
}

/**
 * Moves one file to `_archive/brand/logo-<YYYY-MM-DD>-<n>.<ext>`, never overwriting an earlier archived copy.
 * Tries a hard link first (so the write is atomic and never loses the file mid-move); when the filesystem can't
 * link across volumes (founder-data may live outside this repo, on a different filesystem than expected — EPERM,
 * ENOTSUP or EXDEV), falls back to a plain rename as long as nothing is already at the target.
 */
async function archiveOne(rel: string, ext: LogoExt, date: string): Promise<string> {
  const from = resolveInData(rel);
  for (let n = 1; n < 1000; n++) {
    const target = `_archive/brand/logo-${date}-${n}.${ext}`;
    const to = resolveInData(target);
    await mkdir(path.dirname(to), { recursive: true });
    try {
      await link(from, to);
      await unlink(from);
      return target;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EEXIST") continue;
      if (code && LINK_UNSUPPORTED_CODES.has(code)) {
        const targetExists = await access(to).then(() => true, () => false);
        if (targetExists) continue;
        await rename(from, to);
        return target;
      }
      throw err;
    }
  }
  throw new Error("Couldn't archive the existing logo.");
}

/**
 * Archives every existing `brand/logo.<ext>` file (there should only ever be one live at a time, but this cleans up
 * all of them rather than leaving a stray extension behind). Returns the path of the last one archived, or null
 * when there was none.
 */
async function archiveExistingLogo(): Promise<string | null> {
  const date = localISODate();
  let archived: string | null = null;
  for (const ext of EXTS) {
    const rel = `brand/logo.${ext}`;
    const found = await access(resolveInData(rel)).then(() => true, () => false);
    if (!found) continue;
    archived = await archiveOne(rel, ext, date);
  }
  return archived;
}

/**
 * Validates `bytes` by its magic bytes (PNG, JPEG or WebP) and size, archives any existing logo, and writes the new
 * one atomically to `brand/logo.<ext>`. Returns the founder-data-relative path to store on `founder.logo`.
 */
export async function saveLogo(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength > LOGO_MAX_BYTES) throw new ValidationError(TOO_BIG_MESSAGE);
  const ext = detectLogoExt(bytes);
  if (!ext) throw new ValidationError(UNSUPPORTED_MESSAGE);

  await archiveExistingLogo();

  const rel = `brand/logo.${ext}`;
  const abs = resolveInData(rel);
  await mkdir(path.dirname(abs), { recursive: true });
  const tmp = path.join(path.dirname(abs), `.${path.basename(abs)}.${randomBytes(4).toString("hex")}.tmp`);
  await writeFile(tmp, bytes);
  await rename(tmp, abs);
  return rel;
}

/** Reads the current logo's bytes and content type, or null when there's none. */
export async function readLogo(): Promise<{ bytes: Buffer; contentType: string } | null> {
  const current = await existingLogo();
  if (!current) return null;
  const bytes = await readFile(resolveInData(current.rel));
  return { bytes, contentType: CONTENT_TYPES[current.ext] };
}

/** "Removes" the logo by archiving it (never deletes). Returns the archived path, or null when there was none. */
export async function removeLogo(): Promise<string | null> {
  return archiveExistingLogo();
}

/**
 * The live logo file's modified time, or null when there's none. A page uses this to cache-bust `/api/logo`'s URL so
 * a just-uploaded replacement shows up even when the extension stayed the same (`Date.now()` can't be called during
 * render, so this is read once, here, instead).
 */
export async function logoVersion(): Promise<number | null> {
  const current = await existingLogo();
  if (!current) return null;
  const s = await stat(resolveInData(current.rel));
  return Math.floor(s.mtimeMs);
}
