import { describe, expect, it } from "vitest";
import { CONTACT_DETAILS_MESSAGE } from "../core/privacy";
import { CONTACT_SAMPLES } from "../commands/test-inputs";
import { checkinSchema, conversationSchema, founderSchema, isoDate } from "./schemas";

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => schema.safeParse(v).success;
const founder = (extra: Record<string, unknown>) => ({ name: "Sam", venture: "Lantern", ...extra });
const checkin = (week: string) => ({ week, commitments: [], nextStepLog: [] });

describe("isoDate", () => {
  it("accepts real calendar dates, including a leap day", () => {
    expect(ok(isoDate, "2026-10-13")).toBe(true);
    expect(ok(isoDate, "2028-02-29")).toBe(true);
    expect(ok(isoDate, "2026-12-31")).toBe(true);
  });
  it("rejects dates that don't exist", () => {
    expect(ok(isoDate, "2026-02-30")).toBe(false);
    expect(ok(isoDate, "2026-99-99")).toBe(false);
    expect(ok(isoDate, "2026-13-45")).toBe(false);
    expect(ok(isoDate, "2027-02-29")).toBe(false);
    expect(ok(isoDate, "2026-04-31")).toBe(false);
    expect(ok(isoDate, "2026-10-00")).toBe(false);
  });
  it("still rejects the wrong shape", () => expect(ok(isoDate, "2026-1-3")).toBe(false));
});

describe("founder.startedOn", () => {
  it("needs a month from 01 to 12", () => {
    expect(ok(founderSchema, founder({ startedOn: "2026-01" }))).toBe(true);
    expect(ok(founderSchema, founder({ startedOn: "2026-12" }))).toBe(true);
    expect(ok(founderSchema, founder({ startedOn: "2026-00" }))).toBe(false);
    expect(ok(founderSchema, founder({ startedOn: "2026-13" }))).toBe(false);
  });
  it("flags an impossible pinned today", () => expect(ok(founderSchema, founder({ today: "2026-13-45" }))).toBe(false));
});

describe("founder.logo", () => {
  it("accepts brand/logo.png, .jpg or .webp", () => {
    expect(ok(founderSchema, founder({ logo: "brand/logo.png" }))).toBe(true);
    expect(ok(founderSchema, founder({ logo: "brand/logo.jpg" }))).toBe(true);
    expect(ok(founderSchema, founder({ logo: "brand/logo.webp" }))).toBe(true);
  });
  it("accepts null and absent (no logo set)", () => {
    expect(ok(founderSchema, founder({ logo: null }))).toBe(true);
    expect(ok(founderSchema, founder({}))).toBe(true);
  });
  it("rejects anything else, including svg and a path outside brand/", () => {
    expect(ok(founderSchema, founder({ logo: "brand/logo.svg" }))).toBe(false);
    expect(ok(founderSchema, founder({ logo: "logo.png" }))).toBe(false);
    expect(ok(founderSchema, founder({ logo: "brand/other.png" }))).toBe(false);
  });
});

describe("nextStepLog.via", () => {
  it("records who logged a choice: the app or an agent", () => {
    const entry = { date: "2026-10-13", actionId: "guide:x", label: "X", choice: "dismissed", reason: "Busy" };
    expect(ok(checkinSchema, { ...checkin("2026-W42"), nextStepLog: [{ ...entry, via: "agent" }] })).toBe(true);
    expect(ok(checkinSchema, { ...checkin("2026-W42"), nextStepLog: [entry] })).toBe(true);
    expect(ok(checkinSchema, { ...checkin("2026-W42"), nextStepLog: [{ ...entry, via: "bot" }] })).toBe(false);
  });
});

describe("checkin.week", () => {
  it("accepts W01 to W52", () => {
    expect(ok(checkinSchema, checkin("2026-W01"))).toBe(true);
    expect(ok(checkinSchema, checkin("2027-W52"))).toBe(true);
  });
  it("rejects W00 and anything past W53", () => {
    expect(ok(checkinSchema, checkin("2026-W00"))).toBe(false);
    expect(ok(checkinSchema, checkin("2026-W54"))).toBe(false);
    expect(ok(checkinSchema, checkin("2026-W99"))).toBe(false);
  });
  it("accepts W53 only in years that have one", () => {
    expect(ok(checkinSchema, checkin("2026-W53"))).toBe(true);
    expect(ok(checkinSchema, checkin("2020-W53"))).toBe(true);
    expect(ok(checkinSchema, checkin("2027-W53"))).toBe(false);
  });
});

describe("founder.bringWhatYouHave", () => {
  it("is imported, dismissed or absent", () => {
    expect(ok(founderSchema, founder({ bringWhatYouHave: "dismissed" }))).toBe(true);
    expect(ok(founderSchema, founder({ bringWhatYouHave: "imported" }))).toBe(true);
    expect(ok(founderSchema, founder({}))).toBe(true);
    expect(ok(founderSchema, founder({ bringWhatYouHave: "later" }))).toBe(false);
  });
});

describe("conversation.person", () => {
  const conversation = (person: string) => ({ type: "customer", person });
  it.each(Object.entries(CONTACT_SAMPLES))("refuses contact details (%s) with a clear message", (_kind, person) => {
    const r = conversationSchema.safeParse(conversation(person));
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)).toEqual([`person: ${CONTACT_DETAILS_MESSAGE}`]);
  });
  it("accepts a first name or a role", () => expect(ok(conversationSchema, conversation("Dr. Lee"))).toBe(true));
});
