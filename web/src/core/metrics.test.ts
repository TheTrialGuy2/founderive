import { describe, expect, it } from "vitest";
import { countConversations, latestValue, parseAmount } from "./metrics";
import type { Conversation, Observation } from "@/data/types";

const convo = (id: string, over: Partial<Conversation> = {}): Conversation => ({
  id,
  founderId: "f",
  type: "customer_discovery",
  with: "x",
  org: "y",
  relationship: "cold",
  occurredAt: "2026-10-01",
  newFact: "",
  whatThisChanges: [],
  quotes: [],
  numbers: [],
  contaminationFlags: [],
  followUps: [],
  ...over,
});

describe("countConversations", () => {
  const rule = { type: "customer_discovery" as const, excludeRelationships: ["family" as const, "friend" as const] };

  it("counts only conversations of the rule's type", () => {
    const result = countConversations([convo("a"), convo("b", { type: "mentor" })], rule);
    expect(result.count).toBe(1);
  });

  it("drops excluded relationships and reports them", () => {
    const result = countConversations(
      [convo("a"), convo("b", { relationship: "family" }), convo("c", { relationship: "warm" })],
      rule,
    );
    expect(result.count).toBe(2);
    expect(result.excluded.map((c) => c.id)).toEqual(["b"]);
  });
});

describe("latestValue", () => {
  const obs = (id: string, value: number, observedAt: string, retractedReason?: string): Observation => ({
    id,
    metricId: "m",
    value,
    observedAt,
    source: "s",
    retractedReason,
  });

  it("returns the most recent non-retracted observation", () => {
    const result = latestValue([
      obs("1", 2, "2026-09-01"),
      obs("2", 5, "2026-10-01", "counted a test account"),
      obs("3", 3, "2026-09-20"),
    ]);
    expect(result).toEqual({ value: 3, observedAt: "2026-09-20" });
  });

  it("returns null when nothing is left", () => {
    expect(latestValue([obs("1", 1, "2026-09-01", "wrong")])).toBeNull();
  });
});

describe("parseAmount", () => {
  it.each([
    ["$20,000 (founder cash $7K)", 20000],
    ["3", 3],
    ["2 full-time", 2],
    ["none", undefined],
  ] as const)("%s → %s", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
});
