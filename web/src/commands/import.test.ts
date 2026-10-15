import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { updateEntry } from "../store/update";
import { setBlocker, setCommitmentStatus } from "./checkin";
import { applyWeekUpdate, confirmImportedRecord, createImportDrafts, dismissBringWhatYouHave, importIdOf, weekUpdateIdOf } from "./import";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  await clearLoopRecords(env.dir);
  await rm(path.join(env.dir, "canvas"), { recursive: true, force: true });
});
afterEach(() => env.cleanup());

const BLOCK = [
  "```founderive-import",
  "## Founder",
  "venture: Other Name",
  "problem: Schedules are rebuilt by hand every week",
  "## Canvas: customer",
  "Owners of home-care agencies with 10-50 caregivers",
  "## Assumption",
  "belief: Owners will pay $200 a month",
  "risk: They won't pay for a new tool yet",
  "## Conversation",
  "person: Dana",
  "type: customer",
  "notes: Rebuilds the schedule every Friday",
  "```",
].join("\n");
const TWO_CONVERSATIONS = "## Conversation\nperson: Dana\ntype: customer\n## Conversation\nperson: Lee\ntype: prospect\n## Canvas: customer\nOwners";
const T = "2026-10-13";
const conversationFiles = async () => (await readdir(path.join(env.dir, "conversations"))).sort();

describe("createImportDrafts", () => {
  it("creates seeded drafts tagged with the import id, fills only empty founder fields, and hands assumptions back", async () => {
    const founderFile = path.join(env.dir, "founder.md");
    await writeFile(founderFile, (await readFile(founderFile, "utf8")).replace(/^problem: .*\n/m, ""));
    const r = await createImportDrafts(BLOCK, "2026-10-13");
    const source = `chat import 2026-10-13 #${importIdOf(BLOCK)}`;
    expect(r.importId).toMatch(/^[0-9a-f]{8}$/);
    expect(r.items.map((x) => [x.status, x.path])).toEqual([
      ["created", "founder.md"],
      ["created", "canvas/customer.md"],
      ["created", "conversations/2026-10-13-dana.md"],
    ]);
    expect(r.assumptions).toEqual([{ belief: "Owners will pay $200 a month", risk: "They won't pay for a new tool yet" }]);
    const founder = await readEntry("founder", "founder.md");
    expect(founder?.ok && founder.data).toMatchObject({ venture: "Lantern", problem: "Schedules are rebuilt by hand every week", bringWhatYouHave: "imported" });
    expect(founder?.ok && founder.data.seeded).toBeUndefined();
    const block = await readEntry("canvasBlock", "canvas/customer.md");
    expect(block?.ok && block.data).toMatchObject({ seeded: true, source, status: "untested" });
    const conv = await readEntry("conversation", "conversations/2026-10-13-dana.md");
    expect(conv?.ok && conv.data).toMatchObject({ seeded: true, source, date: null, whatChangesConfirmed: false });
    await expect(readdir(path.join(env.dir, "tests"))).rejects.toThrow();
  });
  it("is idempotent: the same block again creates nothing new", async () => {
    await createImportDrafts(TWO_CONVERSATIONS, "2026-10-13");
    const again = await createImportDrafts(TWO_CONVERSATIONS, "2026-10-13");
    expect(again.items.map((x) => x.status)).toEqual(["skipped", "skipped", "skipped"]);
    expect(again.items.map((x) => x.detail)).toEqual(["Already imported.", "Already imported.", "Already imported."]);
    expect(await conversationFiles()).toEqual(["2026-10-13-dana.md", "2026-10-13-lee.md"]);
  });
  it("resumes after a mid-import failure: the retry creates only what's missing, with no duplicates", async () => {
    const first = await createImportDrafts(TWO_CONVERSATIONS, "2026-10-13", {
      beforeDraft: (i) => {
        if (i === 1) throw new Error("disk full");
      },
    });
    expect(first.items.map((x) => x.status)).toEqual(["created", "failed", "created"]);
    expect(first.items[1].detail).toMatch(/disk full/);
    expect(await conversationFiles()).toEqual(["2026-10-13-dana.md"]);
    const retry = await createImportDrafts(TWO_CONVERSATIONS, "2026-10-13");
    expect(retry.items.map((x) => x.status)).toEqual(["skipped", "created", "skipped"]);
    expect(await conversationFiles()).toEqual(["2026-10-13-dana.md", "2026-10-13-lee.md"]);
  });
  it("never overwrites the founder's own canvas block", async () => {
    await createImportDrafts("## Canvas: customer\nFirst wording", "2026-10-13");
    const r = await createImportDrafts("## Canvas: customer\nSecond wording", "2026-10-13");
    expect(r.items).toEqual([{ label: "Canvas · Customer", status: "skipped", path: "canvas/customer.md", detail: "Already written, so yours was kept." }]);
    const block = await readEntry("canvasBlock", "canvas/customer.md");
    expect(block?.ok && block.data.text).toBe("First wording");
  });
  it("creates nothing while any line needs fixing", async () => {
    await expect(createImportDrafts("## Conversation\nperson: Dana\n## Canvas: customer\nOwners", "2026-10-13")).rejects.toThrow(/Nothing was created/);
    expect(await readEntry("canvasBlock", "canvas/customer.md")).toBeNull();
  });
  it("confirming an imported record clears its imported mark and keeps its source", async () => {
    await createImportDrafts("## Conversation\nperson: Dana\ntype: customer", "2026-10-13");
    await confirmImportedRecord("conversations/2026-10-13-dana.md");
    const conv = await readEntry("conversation", "conversations/2026-10-13-dana.md");
    expect(conv?.ok && conv.data.seeded).toBeUndefined();
    expect(conv?.ok && conv.data.source).toMatch(/^chat import 2026-10-13 #/);
    await expect(confirmImportedRecord("founder.md")).rejects.toThrow(/can't be confirmed/);
  });
});

describe("the Bring what you have card", () => {
  it("is dismissed for good with Not now", async () => {
    await dismissBringWhatYouHave();
    const founder = await readEntry("founder", "founder.md");
    expect(founder?.ok && founder.data.bringWhatYouHave).toBe("dismissed");
  });
});

describe("applyWeekUpdate", () => {
  const file = () => path.join(env.dir, "checkins/2026-W42.md");
  it("applies a clean update in one write", async () => {
    await applyWeekUpdate("2026-W42", "outcome: Book three demos\ndone: c-1\nnew: Call Lee | 2026-10-15\nblocker: No intros yet", T);
    const week = await readEntry("checkin", "checkins/2026-W42.md");
    if (!week?.ok) throw new Error("check-in unreadable");
    expect(week.data).toMatchObject({ outcome: "Book three demos", blocker: "No intros yet" });
    expect(week.data.commitments.find((c) => c.id === "c-1")?.status).toBe("done");
    expect(week.data.commitments.some((c) => c.text === "Call Lee" && c.due === "2026-10-15" && c.status === "open")).toBe(true);
  });
  it("keeps the outcome, the blocker and the help when their lines are left out", async () => {
    await setBlocker("2026-W42", "No intros", "Chris, for two intros");
    await applyWeekUpdate("2026-W42", "kept: c-1", T);
    const week = await readEntry("checkin", "checkins/2026-W42.md");
    expect(week?.ok && week.data).toMatchObject({ outcome: "Talk to five agency owners about scheduling", blocker: "No intros", helpNeeded: "Chris, for two intros" });
  });
  it("does not ask the founder to review a repeating schedule definition", async () => {
    await updateEntry("checkin", "checkins/2026-W42.md", (data, body) => ({
      data: { ...data!, commitments: [...data!.commitments, { id: "c-repeat", text: "Weekly post", due: "tue", status: "open", reason: null, link: null, repeat: { every: "week" as const } }] },
      body,
    }));
    await expect(applyWeekUpdate("2026-W42", "kept: c-1", T)).resolves.toMatchObject({ status: "applied" });
    const week = await readEntry("checkin", "checkins/2026-W42.md");
    expect(week?.ok && week.data.commitments.find((item) => item.id === "c-repeat")?.status).toBe("open");
  });
  it("is all or nothing: a failure after the first change leaves the file exactly as it was", async () => {
    const before = await readFile(file(), "utf8");
    let changes = 0;
    await expect(
      applyWeekUpdate("2026-W42", "outcome: Book three demos\ndone: c-1\nnew: Call Lee |", T, {
        afterChange: () => {
          changes += 1;
          if (changes === 1) throw new Error("disk full");
        },
      }),
    ).rejects.toThrow(/disk full/);
    expect(changes).toBe(1);
    expect(await readFile(file(), "utf8")).toBe(before);
  });
  it("applies nothing when a line blocks", async () => {
    const before = await readFile(file(), "utf8");
    await expect(applyWeekUpdate("2026-W42", "done: c-1\ndropped: c-9 | no reason", T)).rejects.toThrow(/Nothing was changed/);
    expect(await readFile(file(), "utf8")).toBe(before);
  });
});

// Beyond the brief: resumability across days, double submits, and the canvas and founder edge cases.
describe("createImportDrafts, edge cases", () => {
  it("recognizes its own drafts when the retry happens on a later day", async () => {
    await createImportDrafts(TWO_CONVERSATIONS, "2026-10-13", {
      beforeDraft: (i) => {
        if (i === 1) throw new Error("disk full");
      },
    });
    const retry = await createImportDrafts(TWO_CONVERSATIONS, "2026-10-14");
    expect(retry.items.map((x) => x.status)).toEqual(["skipped", "created", "skipped"]);
    expect(await conversationFiles()).toEqual(["2026-10-13-dana.md", "2026-10-14-lee.md"]);
  });
  it("a double submit creates each draft once", async () => {
    const [a, b] = await Promise.all([createImportDrafts(TWO_CONVERSATIONS, "2026-10-13"), createImportDrafts(TWO_CONVERSATIONS, "2026-10-13")]);
    expect([...a.items, ...b.items].filter((x) => x.status === "created")).toHaveLength(3);
    expect(await conversationFiles()).toEqual(["2026-10-13-dana.md", "2026-10-13-lee.md"]);
  });
  it("fills a canvas block that exists with no text, keeping its status and history, and marks it imported", async () => {
    await mkdir(path.join(env.dir, "canvas"), { recursive: true });
    await writeFile(path.join(env.dir, "canvas/customer.md"), "---\nid: customer\ntext: \"\"\nstatus: some-evidence\nhistory:\n  - date: 2026-10-01\n    text: Old wording\n---\nMy notes\n");
    const r = await createImportDrafts("## Canvas: customer\nOwners", "2026-10-13");
    expect(r.items.map((x) => x.status)).toEqual(["created"]);
    const block = await readEntry("canvasBlock", "canvas/customer.md");
    if (!block?.ok) throw new Error("block unreadable");
    expect(block.data).toMatchObject({ text: "Owners", status: "some-evidence", seeded: true, updated: "2026-10-13", history: [{ date: "2026-10-01", text: "Old wording" }] });
    expect(block.body.trim()).toBe("My notes");
  });
  it("reports a canvas file it can't read as failed and still creates the rest", async () => {
    await mkdir(path.join(env.dir, "canvas"), { recursive: true });
    await writeFile(path.join(env.dir, "canvas/customer.md"), "---\nid: customer\nstatus: maybe\n---\n");
    const r = await createImportDrafts("## Canvas: customer\nOwners\n## Conversation\nperson: Dana\ntype: customer", "2026-10-13");
    expect(r.items.map((x) => x.status)).toEqual(["failed", "created"]);
    expect(r.items[0].detail).toMatch(/Fix founder-data\/canvas\/customer.md first/);
  });
  it("hands assumptions back without writing anything, and leaves the card up", async () => {
    const r = await createImportDrafts("## Assumption\nbelief: Owners will pay", "2026-10-13");
    expect(r).toMatchObject({ items: [], assumptions: [{ belief: "Owners will pay", risk: null }] });
    const founder = await readEntry("founder", "founder.md");
    expect(founder?.ok && founder.data.bringWhatYouHave).toBeFalsy();
  });
  it("keeps every founder field that has a value; nothing created leaves the card up", async () => {
    const before = await readFile(path.join(env.dir, "founder.md"), "utf8");
    const r = await createImportDrafts("## Founder\nventure: Other\nproblem: Other problem", "2026-10-13");
    expect(r.items).toEqual([{ label: "Founder details", status: "skipped", path: "founder.md", detail: "Already filled in, so yours were kept." }]);
    expect(await readFile(path.join(env.dir, "founder.md"), "utf8")).toBe(before);
  });
  it("labels the founder fields it filled in plain words", async () => {
    const founderFile = path.join(env.dir, "founder.md");
    await writeFile(founderFile, (await readFile(founderFile, "utf8")).replace(/^targetCustomer: .*\n/m, "").replace(/^oneLiner: .*\n/m, ""));
    const r = await createImportDrafts("## Founder\ncustomer: Agency owners\none-liner: Scheduling", "2026-10-13");
    expect(r.items[0]).toMatchObject({ status: "created", label: "Founder details: customer, one-liner" });
  });
  it("refuses an empty paste", async () => {
    await expect(createImportDrafts("```founderive-import\n```", "2026-10-13")).rejects.toThrow(/nothing to import/);
  });
});

describe("confirmImportedRecord, edge cases", () => {
  it("confirms an imported canvas block", async () => {
    await createImportDrafts("## Canvas: customer\nOwners", "2026-10-13");
    await confirmImportedRecord("canvas/customer.md");
    const block = await readEntry("canvasBlock", "canvas/customer.md");
    expect(block?.ok && block.data.seeded).toBeUndefined();
    expect(block?.ok && block.data.text).toBe("Owners");
  });
  it("doesn't rewrite a record that's already confirmed", async () => {
    await createImportDrafts("## Conversation\nperson: Dana\ntype: customer", "2026-10-13");
    await confirmImportedRecord("conversations/2026-10-13-dana.md");
    const file = path.join(env.dir, "conversations/2026-10-13-dana.md");
    await writeFile(file, (await readFile(file, "utf8")) + "\n");
    const before = await readFile(file, "utf8");
    await confirmImportedRecord("conversations/2026-10-13-dana.md");
    expect(await readFile(file, "utf8")).toBe(before);
  });
  it("refuses paths that aren't records", async () => {
    await expect(confirmImportedRecord("../outside.md")).rejects.toThrow(/can't be confirmed/);
    await expect(confirmImportedRecord("checkins/2026-W42.md")).rejects.toThrow(/can't be confirmed/);
  });
});

describe("dismissBringWhatYouHave, edge cases", () => {
  it("doesn't undo an import", async () => {
    await createImportDrafts("## Conversation\nperson: Dana\ntype: customer", "2026-10-13");
    await dismissBringWhatYouHave();
    const founder = await readEntry("founder", "founder.md");
    expect(founder?.ok && founder.data.bringWhatYouHave).toBe("imported");
  });
});

describe("applyWeekUpdate, edge cases", () => {
  const file = () => path.join(env.dir, "checkins/2026-W42.md");
  it("a failure at the last change also leaves the file exactly as it was", async () => {
    const before = await readFile(file(), "utf8");
    let changes = 0;
    await expect(
      applyWeekUpdate("2026-W42", "outcome: Book three demos\ndone: c-1\nnew: Call Lee |\nblocker: None", T, {
        afterChange: () => {
          changes += 1;
          if (changes === 4) throw new Error("disk full");
        },
      }),
    ).rejects.toThrow(/disk full/);
    expect(changes).toBe(4);
    expect(await readFile(file(), "utf8")).toBe(before);
  });
  it("re-checks against the file: a commitment closed since the preview blocks the whole update", async () => {
    await setCommitmentStatus("2026-W42", "c-1", "done");
    const before = await readFile(file(), "utf8");
    await expect(applyWeekUpdate("2026-W42", "outcome: New\ndone: c-1", T)).rejects.toThrow(/Nothing was changed.*"c-1" isn't one of this week's open commitments/);
    expect(await readFile(file(), "utf8")).toBe(before);
  });
  it("an empty paste changes nothing", async () => {
    const before = await readFile(file(), "utf8");
    await expect(applyWeekUpdate("2026-W42", "  \n", T)).rejects.toThrow(/Nothing was changed/);
    expect(await readFile(file(), "utf8")).toBe(before);
  });
  it("starts the week's check-in when there isn't one yet", async () => {
    await applyWeekUpdate("2026-W43", "outcome: Book demos\nnew: Call Lee | 2026-10-20", "2026-10-20");
    const week = await readEntry("checkin", "checkins/2026-W43.md");
    expect(week?.ok && week.data).toMatchObject({ week: "2026-W43", outcome: "Book demos", commitments: [{ text: "Call Lee", due: "2026-10-20", status: "open" }] });
  });
  it("refuses a malformed week id", async () => {
    await expect(applyWeekUpdate("../2026-W42", "outcome: x", T)).rejects.toThrow();
  });
});

// Review fixes (Task 11).
describe("review fixes: founder values the founder chose", () => {
  const founderFile = () => path.join(env.dir, "founder.md");
  const block = "## Founder\nindustry: Home care\nproblem: Schedules are rebuilt by hand";
  beforeEach(async () => writeFile(founderFile(), (await readFile(founderFile(), "utf8")).replace(/^problem: .*\n/m, "").replace(/^industry: .*\n/m, "")));
  it("writes only the checked fields; an unchecked field isn't written", async () => {
    const r = await createImportDrafts(block, T, { founderFields: ["problem"] });
    const founder = await readEntry("founder", "founder.md");
    expect(founder?.ok && founder.data.problem).toBe("Schedules are rebuilt by hand");
    expect(founder?.ok && founder.data.industry).toBeFalsy();
    expect(r.items[0]).toMatchObject({ status: "created", label: "Founder details: problem" });
  });
  it("writes nothing to founder.md when every field is unchecked", async () => {
    const before = await readFile(founderFile(), "utf8");
    const r = await createImportDrafts(block, T, { founderFields: [] });
    expect(await readFile(founderFile(), "utf8")).toBe(before);
    expect(r.items[0]).toMatchObject({ status: "skipped", detail: "Not chosen, so nothing was written." });
  });
});

describe("review fixes: a weekly update is applied once", () => {
  const UPDATE = "```founderive-week\nkept: c-1\nnew: Call Lee | 2026-10-15\nnew: Visit an agency |\n```";
  const week = async () => {
    const w = await readEntry("checkin", "checkins/2026-W42.md");
    if (!w?.ok) throw new Error("check-in unreadable");
    return w.data;
  };
  it("records the update's id and names new commitments from it", async () => {
    expect(await applyWeekUpdate("2026-W42", UPDATE, T)).toEqual({ status: "applied" });
    const op = weekUpdateIdOf(UPDATE);
    expect(op).toMatch(/^[0-9a-f]{12}$/);
    const w = await week();
    expect(w.appliedUpdates).toEqual([op]);
    expect(w.commitments.filter((c) => c.id !== "c-1" && c.id !== "c-2").map((c) => c.id)).toEqual([`c-${op}-1`, `c-${op}-2`]);
  });
  it("the id ignores surrounding text, blank lines and indentation", () =>
    expect(weekUpdateIdOf("Here:\n```founderive-week\n  kept: c-1\n\nnew: Call Lee | 2026-10-15\nnew: Visit an agency |\n```\nDone!")).toBe(weekUpdateIdOf(UPDATE)));
  it("a replay changes nothing and says so", async () => {
    await applyWeekUpdate("2026-W42", UPDATE, T);
    const after = await readFile(path.join(env.dir, "checkins/2026-W42.md"), "utf8");
    expect(await applyWeekUpdate("2026-W42", UPDATE, T)).toEqual({ status: "already-applied", message: "This update was already applied." });
    expect(await readFile(path.join(env.dir, "checkins/2026-W42.md"), "utf8")).toBe(after);
    expect((await week()).commitments.filter((c) => c.text === "Call Lee")).toHaveLength(1);
  });
  it("a replay of an update that closed a commitment is recognized, not refused", async () => {
    await applyWeekUpdate("2026-W42", "done: c-1", T);
    expect(await applyWeekUpdate("2026-W42", "done: c-1", T)).toMatchObject({ status: "already-applied" });
  });
  it("a concurrent double submit leaves exactly one set of commitments", async () => {
    const results = await Promise.all([applyWeekUpdate("2026-W42", UPDATE, T), applyWeekUpdate("2026-W42", UPDATE, T)]);
    expect(results.map((r) => r.status).sort()).toEqual(["already-applied", "applied"]);
    const w = await week();
    expect(w.commitments.filter((c) => c.text === "Call Lee")).toHaveLength(1);
    expect(w.commitments.filter((c) => c.text === "Visit an agency")).toHaveLength(1);
    expect(w.appliedUpdates).toHaveLength(1);
  });
});

describe("review fixes: a cut-off or stale weekly update is refused", () => {
  const file = () => path.join(env.dir, "checkins/2026-W42.md");
  it("refuses while an open commitment isn't reviewed, changing nothing", async () => {
    const before = await readFile(file(), "utf8");
    await expect(applyWeekUpdate("2026-W42", "outcome: Book three demos", T)).rejects.toThrow(
      "Nothing was changed. Every open commitment needs a kept, done or dropped line. Not reviewed: Email the two agencies from the meetup.",
    );
    expect(await readFile(file(), "utf8")).toBe(before);
  });
  it("blocker none clears the blocker", async () => {
    await setBlocker("2026-W42", "No intros", "Chris");
    await applyWeekUpdate("2026-W42", "kept: c-1\nblocker: None\nhelp: nothing", T);
    const w = await readEntry("checkin", "checkins/2026-W42.md");
    expect(w?.ok && w.data).toMatchObject({ blocker: null, helpNeeded: null });
  });
  it("refuses a page from last week", async () => {
    const before = await readFile(file(), "utf8");
    await expect(applyWeekUpdate("2026-W42", "kept: c-1", "2026-10-19")).rejects.toThrow("This page is from last week. Reload and paste again.");
    expect(await readFile(file(), "utf8")).toBe(before);
  });
});

describe("review fixes: unconfirmed imports aren't evidence until confirmed", () => {
  it("confirming an imported conversation clears seeded", async () => {
    const r = await createImportDrafts("## Conversation\nperson: Dana\ntype: customer", T);
    const rel = r.items[0].path!;
    await confirmImportedRecord(rel);
    const c = await readEntry("conversation", rel);
    expect(c?.ok && c.data.seeded).toBeUndefined();
  });
});
