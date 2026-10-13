import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { addFollowUp, confirmWhatChanges, createConversation, loadConversation, loadConversations, parseConversationForm, setFollowUpStatus, updateConversation } from "./conversations";
import { DANA, MENTOR } from "./test-inputs";

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
