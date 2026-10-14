import { describe, expect, it } from "vitest";
import { canvasBlockSchema, checkinSchema, conversationSchema, founderSchema, testSchema } from "./schemas";

const conversation = { type: "customer", person: "Maya", areas: ["startup-needs", "problem"] };
const test = { title: "T", area: "benefit", belief: "B", test: "Do it", successCriteria: "S", failureCriteria: "F" };

describe("path fields", () => {
  it("accepts any canvas block id as a conversation area or test area", () => {
    expect(conversationSchema.safeParse(conversation).success).toBe(true);
    expect(testSchema.safeParse(test).success).toBe(true);
  });
  it("refuses an area that isn't a block id", () => {
    expect(conversationSchema.safeParse({ ...conversation, areas: ["Startup Needs"] }).success).toBe(false);
    expect(testSchema.safeParse({ ...test, area: "" }).success).toBe(false);
  });
  it("keeps a step's done date and reason on its canvas block", () => {
    const r = canvasBlockSchema.safeParse({ id: "problem", text: "x", done: "2026-10-14", doneReason: "Three people said it" });
    expect(r.success && r.data.done).toBe("2026-10-14");
    expect(canvasBlockSchema.safeParse({ id: "problem", done: "yesterday" }).success).toBe(false);
  });
  it("keeps this week's talk goal, outreach and focus on the check-in", () => {
    const r = checkinSchema.safeParse({ week: "2026-W42", talkGoal: 4, outreach: { reached: 14, replied: 4 }, focus: "revenue" });
    expect(r.success && r.data.outreach).toEqual({ reached: 14, replied: 4 });
    expect(checkinSchema.safeParse({ week: "2026-W42", outreach: { reached: -1, replied: 0 } }).success).toBe(false);
    expect(checkinSchema.safeParse({ week: "2026-W42", talkGoal: 0 }).success).toBe(false);
  });
  it("allows replied to be more than reached (people write to you first)", () => {
    expect(checkinSchema.safeParse({ week: "2026-W42", outreach: { reached: 1, replied: 3 } }).success).toBe(true);
  });
  it("keeps a weekly talk goal on the founder", () => {
    expect(founderSchema.safeParse({ weeklyTalkGoal: 5 }).success).toBe(true);
    expect(founderSchema.safeParse({ weeklyTalkGoal: 0 }).success).toBe(false);
  });
});
