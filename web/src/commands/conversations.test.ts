import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { addFollowUp, archiveImportedConversation, confirmAllImportedConversations, confirmImportedConversation, confirmWhatChanges, createConversation, loadConversation, loadConversations, parseConversationForm, setFollowUpStatus, updateConversation } from "./conversations";
import { CONTACT_DETAILS_MESSAGE } from "../core/privacy";
import { checkData } from "../store/check";
import { CONTACT_SAMPLES, DANA, MENTOR } from "./test-inputs";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  await clearLoopRecords(env.dir);
});
afterEach(() => env.cleanup());

const DANA_PATH = "conversations/2026-10-08-dana-ortiz-bright-home-care.md";
const form = (fields: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
};

describe("parseConversationForm", () => {
  it("reads quotes and numbers one per line, areas and follow-up rows", () => {
    const r = parseConversationForm(
      form({
        type: "customer",
        person: "Dana Ortiz",
        date: "2026-10-08",
        quotes: "I lose my Friday.\n\n  It's a mess.  ",
        numbers: "4 hours a week",
        areas: ["problem", "revenue"],
        followUpText: ["Send the one-pager", "", ""],
        followUpDue: ["2026-10-12", "", ""],
        notes: "Notes",
      }),
    );
    expect(r.ok && r.input).toMatchObject({
      quotes: ["I lose my Friday.", "It's a mess."],
      numbers: ["4 hours a week"],
      areas: ["problem", "revenue"],
      followUps: [{ text: "Send the one-pager", due: "2026-10-12" }],
      org: null,
    });
  });
  it("marks 'what this changes' typed on the founder's form as theirs", () => {
    const base = { type: "customer", person: "Dana Ortiz", date: "2026-10-08" };
    const typed = parseConversationForm(form({ ...base, whatChanges: "Price ceiling near $300" }));
    expect(typed.ok && typed.input).toMatchObject({ whatChanges: "Price ceiling near $300", whatChangesConfirmed: true });
    const blank = parseConversationForm(form({ ...base, whatChanges: "" }));
    expect(blank.ok && blank.input.whatChangesConfirmed).toBe(false);
  });
  it("returns field errors and keeps what was typed", () => {
    const r = parseConversationForm(form({ type: "friend", person: "", date: "2026-02-30", notes: "keep me", followUpText: [""], followUpDue: ["2026-10-12"] }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(["date", "followUpText0", "person", "type"]);
      expect(r.values.notes).toBe("keep me");
      expect(r.values.followUpDue0).toBe("2026-10-12");
    }
  });
});

describe("conversation commands", () => {
  it("logs a conversation as a new dated file and never overwrites", async () => {
    expect(await createConversation(DANA)).toBe(DANA_PATH);
    expect(await createConversation(DANA)).toBe("conversations/2026-10-08-dana-ortiz-bright-home-care-2.md");
    const e = await readEntry("conversation", DANA_PATH);
    expect(e?.ok && e.data).toMatchObject({
      type: "customer",
      relatedTests: [],
      whatChangesConfirmed: false,
      followUps: [{ text: "Send the one-pager", due: "2026-10-12", status: "open" }],
    });
    expect(e?.ok && e.body.trim()).toBe("Call notes.");
  });
  it("files a conversation with an unknown date under today, keeping the date unknown", async () => {
    const rel = await createConversation({ ...DANA, date: null }, { seeded: true, source: "chat import 2026-10-13" }, "2026-10-13");
    expect(rel).toBe("conversations/2026-10-13-dana-ortiz-bright-home-care.md");
    const e = await readEntry("conversation", rel);
    expect(e?.ok && e.data).toMatchObject({ date: null, seeded: true, source: "chat import 2026-10-13" });
    await expect(createConversation({ ...DANA, date: null })).rejects.toThrow(/date/);
  });
  it("treats 'what this changes' as confirmed only when the founder's form says they wrote it", async () => {
    const mine = await createConversation({ ...DANA, whatChanges: "The price ceiling may be near $300", whatChangesConfirmed: true });
    const e = await readEntry("conversation", mine);
    expect(e?.ok && e.data.whatChangesConfirmed).toBe(true);
  });
  it("leaves a drafted 'what this changes' unconfirmed when the caller doesn't say who wrote it", async () => {
    const drafted = await createConversation({ ...DANA, whatChanges: "The price ceiling may be near $300" }, { seeded: true, source: "chat import" });
    const e = await readEntry("conversation", drafted);
    expect(e?.ok && e.data).toMatchObject({ whatChanges: "The price ceiling may be near $300", whatChangesConfirmed: false });
    const empty = await createConversation({ ...DANA, whatChanges: null, whatChangesConfirmed: true });
    const f = await readEntry("conversation", empty);
    expect(f?.ok && f.data.whatChangesConfirmed).toBe(false);
  });
  it("edits details and notes but keeps follow-ups, links and what this changes", async () => {
    const rel = await createConversation({ ...DANA, whatChanges: "Weekly pain", whatChangesConfirmed: true });
    await updateConversation(rel, { ...DANA, person: "Dana O.", followUps: [], whatChanges: null, notes: "Better notes" });
    const e = await readEntry("conversation", rel);
    expect(e?.ok && e.data).toMatchObject({ person: "Dana O.", whatChanges: "Weekly pain", whatChangesConfirmed: true });
    expect(e?.ok && e.data.followUps).toHaveLength(1);
    expect(e?.ok && e.body.trim()).toBe("Better notes");
  });
  it("adds follow-ups and marks them done or open again", async () => {
    const rel = await createConversation({ ...DANA, followUps: [] });
    await expect(addFollowUp(rel, { text: " ", due: null })).rejects.toThrow(/follow-up/);
    const id = await addFollowUp(rel, { text: "Call back Friday", due: "2026-10-16" });
    await setFollowUpStatus(rel, id, "done");
    let e = await readEntry("conversation", rel);
    expect(e?.ok && e.data.followUps[0]).toMatchObject({ id, status: "done" });
    await setFollowUpStatus(rel, id, "open");
    e = await readEntry("conversation", rel);
    expect(e?.ok && e.data.followUps[0].status).toBe("open");
    await expect(setFollowUpStatus(rel, "f-nope", "done")).rejects.toThrow(/no longer exists/);
  });
  it("confirms what this changes only with text", async () => {
    const rel = await createConversation(DANA);
    await expect(confirmWhatChanges(rel, "")).rejects.toThrow(/changes/);
    await confirmWhatChanges(rel, "Owners feel it every week");
    const e = await readEntry("conversation", rel);
    expect(e?.ok && e.data).toMatchObject({ whatChanges: "Owners feel it every week", whatChangesConfirmed: true });
  });
});

describe("conversation views", () => {
  it("groups customer evidence apart from advice and lists unreadable files", async () => {
    await createConversation(DANA);
    await createConversation(MENTOR);
    await writeFile(path.join(env.dir, "conversations/2026-10-01-broken.md"), "---\ntype: friend\n---\n");
    const v = await loadConversations();
    expect(v.evidence.map((r) => r.data.person)).toEqual(["Dana Ortiz"]);
    expect(v.advice.map((r) => r.data.person)).toEqual(["Chris Lee"]);
    expect(v.flagged.map((f) => f.path)).toEqual(["conversations/2026-10-01-broken.md"]);
  });
  it("loads one conversation by slug, refusing names that aren't dated entries", async () => {
    await createConversation(DANA);
    expect(await loadConversation("2026-10-08-dana-ortiz-bright-home-care")).toMatchObject({ status: "ready", path: DANA_PATH, notes: "Call notes.", broken: [] });
    expect(await loadConversation("2026-10-09-nobody")).toEqual({ status: "missing" });
    expect(await loadConversation("../founder")).toEqual({ status: "missing" });
  });
  it("flags a link to a missing test without dropping the conversation", async () => {
    await mkdir(path.join(env.dir, "conversations"), { recursive: true });
    await writeFile(path.join(env.dir, "conversations/2026-10-02-lee.md"), "---\ntype: prospect\nperson: Lee\ndate: 2026-10-02\nrelatedTests:\n  - tests/2026-10-01-gone.md\n---\n");
    const v = await loadConversation("2026-10-02-lee");
    expect(v.status === "ready" && v.broken).toEqual([{ field: "relatedTests", target: "tests/2026-10-01-gone.md", expect: "test", problem: "missing" }]);
  });
});

describe("contact details never reach a conversation's person", () => {
  const samples = Object.entries(CONTACT_SAMPLES);
  it.each(samples)("the form refuses %s and keeps what was typed", (_kind, person) => {
    const r = parseConversationForm(form({ type: "customer", person, date: "2026-10-08" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.person).toBe(CONTACT_DETAILS_MESSAGE);
    expect(r.values.person).toBe(person);
  });
  it.each(samples)("createConversation refuses %s, writing nothing", async (_kind, person) => {
    await expect(createConversation({ ...DANA, person })).rejects.toThrow(CONTACT_DETAILS_MESSAGE);
    expect((await loadConversations()).evidence).toEqual([]);
  });
  it.each(samples)("updateConversation refuses %s, keeping the file as it was", async (_kind, person) => {
    const rel = await createConversation(DANA);
    await expect(updateConversation(rel, { ...DANA, person })).rejects.toThrow(CONTACT_DETAILS_MESSAGE);
    const e = await readEntry("conversation", rel);
    expect(e?.ok && e.data.person).toBe("Dana Ortiz");
  });
  it.each(samples)("check-data flags a hand-written file with %s", async (_kind, person) => {
    await mkdir(path.join(env.dir, "conversations"), { recursive: true });
    await writeFile(path.join(env.dir, "conversations/2026-10-09-hand.md"), `---\ntype: customer\nperson: "${person}"\n---\nNotes\n`);
    const report = await checkData();
    expect(report.errors).toContainEqual({ path: "conversations/2026-10-09-hand.md", error: `person: ${CONTACT_DETAILS_MESSAGE}` });
  });
});

describe("confirming imported conversations", () => {
  const imported = (person: string, date: string) => createConversation({ ...DANA, person, org: null, date, whatChanges: "Drafted by the import", whatChangesConfirmed: false }, { seeded: true, source: "chat import 2026-10-13 #abc" });

  it("clears only the seeded mark on one conversation, keeping its source and the unconfirmed draft", async () => {
    const rel = await imported("Maya", "2026-10-07");
    await confirmImportedConversation(rel);
    const e = await readEntry("conversation", rel);
    if (!e?.ok) throw new Error("unreadable");
    expect(e.data.seeded).toBeUndefined();
    expect(e.data.source).toBe("chat import 2026-10-13 #abc");
    expect(e.data.whatChanges).toBe("Drafted by the import");
    expect(e.data.whatChangesConfirmed).toBe(false);
  });

  it("leaves a conversation that isn't imported untouched", async () => {
    const rel = await createConversation(DANA);
    const before = await readFile(path.join(env.dir, rel), "utf8");
    expect(await confirmImportedConversation(rel)).toBe(false);
    expect(await readFile(path.join(env.dir, rel), "utf8")).toBe(before);
  });

  it("confirms only the listed imported conversations, skips the rest, and names a listed file that turned unreadable", async () => {
    const a = await imported("Maya", "2026-10-07");
    const b = await imported("Lee", "2026-10-08");
    const own = await createConversation(DANA);
    const ownBefore = await readFile(path.join(env.dir, own), "utf8");
    const broken = "conversations/2026-10-09-broken.md";
    await writeFile(path.join(env.dir, broken), "---\nseeded: true\ntype: customer\n---\nNotes\n");
    await writeFile(path.join(env.dir, "conversations/2026-10-09-other-broken.md"), "---\ntype: customer\n---\nNotes\n");

    const r = await confirmAllImportedConversations([a, b, own, broken]);
    expect(r).toEqual({ confirmed: 2, broken: [broken], failed: [] });
    for (const rel of [a, b]) {
      const e = await readEntry("conversation", rel);
      expect(e?.ok && e.data.seeded).toBeFalsy();
    }
    expect(await readFile(path.join(env.dir, own), "utf8")).toBe(ownBefore);
    expect(await confirmAllImportedConversations([a, b, own, broken])).toEqual({ confirmed: 0, broken: [broken], failed: [] });
  });

  it("leaves an import made after the founder's list alone", async () => {
    const seen = await imported("Maya", "2026-10-07");
    const later = await imported("Lee", "2026-10-08");
    expect(await confirmAllImportedConversations([seen])).toEqual({ confirmed: 1, broken: [], failed: [] });
    const e = await readEntry("conversation", later);
    expect(e?.ok && e.data.seeded).toBe(true);
  });

  it("counts each conversation once when two Confirm alls run at the same time", async () => {
    const a = await imported("Maya", "2026-10-07");
    const b = await imported("Lee", "2026-10-08");
    const [r1, r2] = await Promise.all([confirmAllImportedConversations([a, b]), confirmAllImportedConversations([a, b])]);
    expect(r1.confirmed + r2.confirmed).toBe(2);
  });

  it("refuses paths that aren't conversation files, before changing anything", async () => {
    const a = await imported("Maya", "2026-10-07");
    for (const bad of ["founder.md", "../outside.md", "conversations/../founder.md", "tests/2026-10-07-x.md", "conversations/notes.md"]) {
      await expect(confirmAllImportedConversations([a, bad])).rejects.toThrow(/isn't a conversation file/);
    }
    const e = await readEntry("conversation", a);
    expect(e?.ok && e.data.seeded).toBe(true);
  });
});

describe("moving an import that isn't the founder's to _archive", () => {
  const imported = (person: string) => createConversation({ ...DANA, person, org: null, date: "2026-10-07" }, { seeded: true, source: "chat import" });

  it("moves the imported file to _archive/<its path>, never deleting it", async () => {
    const rel = await imported("Maya");
    const before = await readFile(path.join(env.dir, rel), "utf8");
    expect(await archiveImportedConversation(rel)).toBe(`_archive/${rel}`);
    expect(await readEntry("conversation", rel)).toBeNull();
    expect(await readFile(path.join(env.dir, "_archive", rel), "utf8")).toBe(before);
  });

  it("refuses a conversation the founder has confirmed or logged themselves, and a missing or out-of-pattern path", async () => {
    const own = await createConversation(DANA);
    await expect(archiveImportedConversation(own)).rejects.toThrow(/only imported conversations/i);
    expect(await readEntry("conversation", own)).not.toBeNull();
    await expect(archiveImportedConversation("conversations/2026-10-01-gone.md")).rejects.toThrow(/isn't there anymore/);
    await expect(archiveImportedConversation("founder.md")).rejects.toThrow(/isn't a conversation file/);
  });
});
