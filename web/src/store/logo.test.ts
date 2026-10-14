import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readLogo, removeLogo, saveLogo, ValidationError as LogoValidationError } from "./logo";
import { useTempData } from "./test-helpers";
import { ValidationError } from "./write";

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return { ...actual, link: vi.fn(actual.link) };
});

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

const exists = (p: string) => access(p).then(() => true, () => false);

// Minimal-but-real file signatures. Only the magic bytes matter to saveLogo; the rest is filler.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100, 2)]);
const WEBP = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.from([0x00, 0x00, 0x00, 0x00]), Buffer.from("WEBP", "ascii"), Buffer.alloc(100, 3)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf8");
const TEXT = Buffer.from("just some text, not an image", "utf8");

describe("saveLogo", () => {
  it("accepts a PNG by its magic bytes and writes brand/logo.png", async () => {
    const rel = await saveLogo(PNG);
    expect(rel).toBe("brand/logo.png");
    expect(await readFile(path.join(env.dir, "brand/logo.png"))).toEqual(PNG);
  });

  it("accepts a JPEG by its magic bytes and writes brand/logo.jpg", async () => {
    const rel = await saveLogo(JPEG);
    expect(rel).toBe("brand/logo.jpg");
    expect(await readFile(path.join(env.dir, "brand/logo.jpg"))).toEqual(JPEG);
  });

  it("accepts a WebP by its magic bytes and writes brand/logo.webp", async () => {
    const rel = await saveLogo(WEBP);
    expect(rel).toBe("brand/logo.webp");
    expect(await readFile(path.join(env.dir, "brand/logo.webp"))).toEqual(WEBP);
  });

  it("rejects an SVG with a friendly message", async () => {
    await expect(saveLogo(SVG)).rejects.toThrow(LogoValidationError);
    await expect(saveLogo(SVG)).rejects.toThrow(/PNG, JPG or WebP/);
  });

  it("rejects plain text", async () => {
    await expect(saveLogo(TEXT)).rejects.toThrow(LogoValidationError);
  });

  it("rejects a file over 1,000,000 bytes even with a valid header", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(1_000_000)]);
    await expect(saveLogo(big)).rejects.toThrow(LogoValidationError);
    await expect(saveLogo(big)).rejects.toThrow(/1 MB|1,000,000/);
  });

  it("the logo ValidationError is the same class the rest of the store uses", () => {
    expect(LogoValidationError).toBe(ValidationError);
  });

  it("replacing an existing logo archives the old one; both files exist afterwards", async () => {
    await saveLogo(PNG);
    const png2 = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50, 9)]);
    const rel = await saveLogo(png2);
    expect(rel).toBe("brand/logo.png");
    expect(await exists(path.join(env.dir, "brand/logo.png"))).toBe(true);
    expect(await readFile(path.join(env.dir, "brand/logo.png"))).toEqual(png2);
    const archived = await readdir(path.join(env.dir, "_archive/brand"));
    expect(archived).toHaveLength(1);
    expect(archived[0]).toMatch(/^logo-\d{4}-\d{2}-\d{2}-1\.png$/);
    expect(await readFile(path.join(env.dir, "_archive/brand", archived[0]))).toEqual(PNG);
  });

  it("archives repeatedly without ever overwriting an earlier archive", async () => {
    await saveLogo(PNG);
    await saveLogo(JPEG); // different extension: the old brand/logo.png is archived, brand/logo.jpg is now live
    await saveLogo(PNG); // back to png: the brand/logo.jpg is archived
    const archived = await readdir(path.join(env.dir, "_archive/brand"));
    expect(archived.sort()).toEqual(expect.arrayContaining([expect.stringMatching(/^logo-.*\.png$/), expect.stringMatching(/^logo-.*\.jpg$/)]));
    expect(archived).toHaveLength(2);
  });

  it("archives every existing brand/logo.* file, not just the first extension found", async () => {
    // A state that shouldn't normally happen (saveLogo only ever leaves one live), but a save should still clean up
    // every stray extension rather than leaving one behind.
    await mkdir(path.join(env.dir, "brand"), { recursive: true });
    await writeFile(path.join(env.dir, "brand/logo.png"), PNG);
    await writeFile(path.join(env.dir, "brand/logo.jpg"), JPEG);
    await saveLogo(WEBP);
    expect(await exists(path.join(env.dir, "brand/logo.png"))).toBe(false);
    expect(await exists(path.join(env.dir, "brand/logo.jpg"))).toBe(false);
    expect(await exists(path.join(env.dir, "brand/logo.webp"))).toBe(true);
    const archived = await readdir(path.join(env.dir, "_archive/brand"));
    expect(archived.sort()).toEqual(expect.arrayContaining([expect.stringMatching(/^logo-.*\.png$/), expect.stringMatching(/^logo-.*\.jpg$/)]));
    expect(archived).toHaveLength(2);
  });

  it("falls back to a rename when link() fails as unsupported (founder-data on another filesystem)", async () => {
    await saveLogo(PNG);
    const linkMock = vi.mocked(fsPromises.link);
    linkMock.mockImplementationOnce(async () => {
      throw Object.assign(new Error("cross-device link not permitted"), { code: "EXDEV" });
    });
    const png2 = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50, 7)]);
    const rel = await saveLogo(png2);
    expect(linkMock).toHaveBeenCalled();
    expect(rel).toBe("brand/logo.png");
    expect(await readFile(path.join(env.dir, "brand/logo.png"))).toEqual(png2);
    const archived = await readdir(path.join(env.dir, "_archive/brand"));
    expect(archived).toHaveLength(1);
    expect(await readFile(path.join(env.dir, "_archive/brand", archived[0]))).toEqual(PNG);
  });

  it("never falls back to rename on an ordinary error (e.g. EACCES)", async () => {
    await saveLogo(PNG);
    const linkMock = vi.mocked(fsPromises.link);
    linkMock.mockImplementationOnce(async () => {
      throw Object.assign(new Error("permission denied"), { code: "EACCES" });
    });
    await expect(saveLogo(JPEG)).rejects.toThrow(/permission denied/);
  });
});

describe("removeLogo", () => {
  it("archives the current logo and leaves none live", async () => {
    await saveLogo(PNG);
    const archivedTo = await removeLogo();
    expect(archivedTo).toMatch(/^_archive\/brand\/logo-\d{4}-\d{2}-\d{2}-1\.png$/);
    expect(await exists(path.join(env.dir, "brand/logo.png"))).toBe(false);
    expect(await exists(path.join(env.dir, archivedTo!))).toBe(true);
  });

  it("does nothing and returns null when there's no logo", async () => {
    expect(await removeLogo()).toBeNull();
  });
});

describe("readLogo", () => {
  it("returns null when there's no logo", async () => {
    expect(await readLogo()).toBeNull();
  });

  it("reads back a PNG with the right content type", async () => {
    await saveLogo(PNG);
    const logo = await readLogo();
    expect(logo?.contentType).toBe("image/png");
    expect(logo?.bytes).toEqual(PNG);
  });

  it("reads back a JPEG with the right content type", async () => {
    await saveLogo(JPEG);
    const logo = await readLogo();
    expect(logo?.contentType).toBe("image/jpeg");
  });

  it("reads back a WebP with the right content type", async () => {
    await saveLogo(WEBP);
    const logo = await readLogo();
    expect(logo?.contentType).toBe("image/webp");
  });
});

// Guards the archive-naming invariant even if founder-data/brand didn't exist yet.
describe("saveLogo on a fresh folder", () => {
  it("creates brand/ if it doesn't exist", async () => {
    await mkdir(path.join(env.dir, "brand"), { recursive: true }).catch(() => {});
    const rel = await saveLogo(PNG);
    expect(rel).toBe("brand/logo.png");
  });
});
