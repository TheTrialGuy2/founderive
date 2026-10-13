import type { Stage } from "../store/schemas";

export type GuideFacts = {
  hasTargetCustomer: boolean;
  customerConversations: number;
  tests: number;
  completedTests: number;
  hasOffer: boolean;
  offersMade: number;
  hasMoneyPulse: boolean;
  repeatCustomers: number;
};

export type GuideStep = {
  id: string;
  title: string; // verb + object, shown as the next action
  why: string;
  area: "customer" | "problem" | "solution" | "channel" | "revenue" | "cost" | "feasibility";
  evidence: string; // what done looks like
  startsTest: boolean;
  stages: Stage[];
  done: (f: GuideFacts) => boolean;
};

const NO_FACTS: GuideFacts = {
  hasTargetCustomer: false,
  customerConversations: 0,
  tests: 0,
  completedTests: 0,
  hasOffer: false,
  offersMade: 0,
  hasMoneyPulse: false,
  repeatCustomers: 0,
};

// Program-agnostic early-stage journey, grounded in public practice (customer discovery, testing, asking for money, unit economics).
export const GUIDE_STEPS: GuideStep[] = [
  { id: "customer", title: "Name the first customer you'll talk to", why: "A specific customer makes every other step concrete.", area: "customer", evidence: "A described customer segment", startsTest: false, stages: ["idea", "validating"], done: (f) => f.hasTargetCustomer },
  { id: "problem-conversations", title: "Talk to five people who have the problem", why: "Their words and workarounds are your first real evidence.", area: "problem", evidence: "Five logged customer conversations", startsTest: false, stages: ["idea", "validating"], done: (f) => f.customerConversations >= 5 },
  { id: "riskiest-assumption", title: "Turn your riskiest assumption into a test", why: "Testing the belief most likely to sink you saves the most wasted work.", area: "problem", evidence: "A venture test with pass and fail criteria", startsTest: true, stages: ["idea", "validating", "pre-revenue"], done: (f) => f.tests >= 1 },
  { id: "finish-test", title: "Run your test to a result", why: "A clear result, even a no, is progress.", area: "feasibility", evidence: "A completed test with a decision", startsTest: false, stages: ["validating", "pre-revenue"], done: (f) => f.completedTests >= 1 },
  { id: "offer", title: "Write a small offer with a price", why: "A concrete offer turns interest into a yes or a no.", area: "revenue", evidence: "A current offer with price and unit of sale", startsTest: false, stages: ["validating", "pre-revenue"], done: (f) => f.hasOffer },
  { id: "unit-economics", title: "Check that each sale makes money", why: "Growth only helps if each sale covers its costs.", area: "cost", evidence: "Price, variable cost and margin recorded", startsTest: false, stages: ["revenue"], done: (f) => f.hasMoneyPulse },
  { id: "ask-to-pay", title: "Ask three qualified prospects to pay", why: "Payment is the strongest evidence you can get.", area: "revenue", evidence: "Three offers made, with outcomes", startsTest: true, stages: ["pre-revenue", "revenue"], done: (f) => f.offersMade >= 3 },
  { id: "repeat", title: "Learn why customers come back, or don't", why: "Repeat use shows real value.", area: "customer", evidence: "Conversations with repeat and lapsed customers", startsTest: false, stages: ["revenue"], done: (f) => f.repeatCustomers > 0 },
];

/** The first guide step relevant to this stage that isn't done and isn't already committed to this week. */
export function guideStepFor(stage: Stage | null | undefined, facts: Partial<GuideFacts>, excludeIds: Set<string> = new Set()): GuideStep | null {
  const f = { ...NO_FACTS, ...facts };
  const s = stage ?? "idea";
  return GUIDE_STEPS.find((step) => step.stages.includes(s) && !step.done(f) && !excludeIds.has(step.id)) ?? null;
}
