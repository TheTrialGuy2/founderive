import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkData } from "./check";
import { useTempData } from "./test-helpers";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("checkData", () => {
  it("reports invalid files and unknown files, skipping _archive", async () => {
    const report = await checkData();
    expect(report.checked).toBe(6);
    expect(report.errors.map((e) => e.path)).toEqual(["program/week-02.md", "program/week-03.md"]);
    expect(report.unknown).toEqual(["notes/scratch.md"]);
    expect(report.warnings).toEqual([]);
    expect(report.misnamed).toEqual([]);
  });

  it("warns about a misnamed file in a known folder instead of calling it valid", async () => {
    await writeFile(path.join(env.dir, "checkins/week-42.md"), "---\nweek: 2026-W42\n---\n");
    await mkdir(path.join(env.dir, "canvas"), { recursive: true });
    await writeFile(path.join(env.dir, "canvas/Customer.md"), "---\nid: customer\n---\n");
    const report = await checkData();
    expect(report.misnamed).toEqual(["canvas/Customer.md", "checkins/week-42.md"]);
    expect(report.warnings).toEqual([
      { path: "canvas/Customer.md", warning: "Founderive ignores this file: names in canvas/ look like canvas/<id>.md (lowercase letters, digits and hyphens) or canvas/blocks.md" },
      { path: "checkins/week-42.md", warning: "Founderive ignores this file: names in checkins/ look like checkins/YYYY-Www.md" },
    ]);
    expect(report.unknown).toEqual(["notes/scratch.md"]);
  });

  it("warns about a broken link without failing the record", async () => {
    await mkdir(path.join(env.dir, "tests"), { recursive: true });
    await writeFile(
      path.join(env.dir, "tests/2026-10-01-broken.md"),
      "---\ntitle: Paid pilot\narea: revenue\nbelief: Owners will pay\ntest: Offer a pilot\nsuccessCriteria: Two sign\nfailureCriteria: None sign\nrelatedConversations:\n  - conversations/2026-10-01-gone.md\n---\n",
    );
    const report = await checkData();
    expect(report.errors.map((e) => e.path)).not.toContain("tests/2026-10-01-broken.md");
    expect(report.warnings).toEqual([{ path: "tests/2026-10-01-broken.md", warning: "relatedConversations: conversations/2026-10-01-gone.md isn't in founder-data" }]);
  });
});
