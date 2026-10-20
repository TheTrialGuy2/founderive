import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkData } from "./check";
import { useTempData } from "./test-helpers";

describe("step links", () => {
  let env: Awaited<ReturnType<typeof useTempData>>;

  beforeEach(async () => (env = await useTempData(false)));
  afterEach(() => env.cleanup());

  const put = async (rel: string, text: string) => {
    await mkdir(path.dirname(path.join(env.dir, rel)), { recursive: true });
    await writeFile(path.join(env.dir, rel), text);
  };

  it("warns when a conversation, test or planned conversation names no step", async () => {
    await put("conversations/2026-10-12-x.md", "---\ntype: customer\nperson: Maya\nareas: [benefit]\n---\n");
    await put("tests/2026-10-12-y.md", "---\ntitle: T\narea: message\nbelief: B\ntest: Do\nsuccessCriteria: S\nfailureCriteria: F\n---\n");
    await put("checkins/2026-W43.md", "---\nweek: 2026-W43\ncommitments:\n  - id: c-9\n    text: Talk to Dana about Name\n    link: step:name\n---\n");
    const r = await checkData();
    const text = r.warnings.map((w) => `${w.path}: ${w.warning}`).join("\n");
    expect(text).toMatch(/2026-10-12-x\.md: .*"benefit" isn't a step/);
    expect(text).toMatch(/2026-10-12-y\.md: .*"message" isn't a step/);
    expect(text).toMatch(/2026-W43\.md: .*"name" isn't a step/);
    expect(r.errors).toEqual([]);
  });
  it("accepts the founder's own steps and the seven shipped areas", async () => {
    await put("canvas/blocks.md", "---\nblocks:\n  - id: benefit\n    title: Benefit\n    prompt: What do they gain?\n---\n");
    await put("conversations/2026-10-12-x.md", "---\ntype: customer\nperson: Maya\nareas: [benefit, feasibility]\n---\n");
    const r = await checkData();
    expect(r.warnings.filter((w) => /isn't a step/.test(w.warning))).toEqual([]);
  });
  it("warns when an open planned conversation holds contact details, and not once it's done", async () => {
    await put(
      "checkins/2026-W43.md",
      "---\nweek: 2026-W43\ncommitments:\n  - id: c-1\n    text: Talk to dana@example.com about Problem\n    link: step:problem\n  - id: c-2\n    text: Talk to 704-555-0199 about Problem\n    status: done\n    link: step:problem\n  - id: c-3\n    text: Talk to Dana about Problem\n    link: step:problem\n---\n",
    );
    const r = await checkData();
    const hits = r.warnings.filter((w) => /contact details/i.test(w.warning));
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ path: "checkins/2026-W43.md" });
    expect(hits[0].warning).toMatch(/c-1/);
  });
  it("warns when a commitment links to a record that isn't there, and not when it is", async () => {
    await put("conversations/2026-10-08-dana.md", "---\ntype: customer\nperson: Dana\nareas: [problem]\n---\n");
    await put(
      "checkins/2026-W43.md",
      "---\nweek: 2026-W43\ncommitments:\n  - id: c-1\n    text: Send the outline\n    link: conversations/2026-10-08-dana.md\n  - id: c-2\n    text: Lost\n    link: conversations/2026-01-01-gone.md\n  - id: c-3\n    text: Program work\n    link: program/week-09.md\n---\n",
    );
    const r = await checkData();
    const hits = r.warnings.filter((w) => /links to/.test(w.warning));
    expect(hits).toEqual([{ path: "checkins/2026-W43.md", warning: 'commitments: "c-2" links to conversations/2026-01-01-gone.md, which isn\'t in founder-data. Fix the link or remove it.' }]);
    expect(r.errors).toEqual([]);
  });
});
