import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { useTempData } from "../store/test-helpers";
import { clearLogo, setLogo } from "./logo";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);

describe("setLogo", () => {
  it("saves the file and writes its path to founder.logo", async () => {
    const rel = await setLogo(PNG);
    expect(rel).toBe("brand/logo.png");
    const founder = await readEntry("founder", "founder.md");
    expect(founder?.ok && founder.data.logo).toBe("brand/logo.png");
  });

  it("keeps the rest of founder.md untouched", async () => {
    await setLogo(PNG);
    const founder = await readEntry("founder", "founder.md");
    expect(founder?.ok && founder.data.venture).toBe("Lantern");
  });
});

describe("clearLogo", () => {
  it("archives the file and clears founder.logo", async () => {
    await setLogo(PNG);
    await clearLogo();
    const founder = await readEntry("founder", "founder.md");
    expect(founder?.ok && founder.data.logo).toBeNull();
  });

  it("is a no-op on founder.logo when there was never a logo", async () => {
    await clearLogo();
    const founder = await readEntry("founder", "founder.md");
    expect(founder?.ok && founder.data.logo).toBeFalsy();
  });
});
