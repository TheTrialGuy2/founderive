// Shared inputs for command tests. Not a test file itself.
import type { ConversationInput } from "./conversations";
import type { TestInput } from "./venture-tests";

export const DANA: ConversationInput = {
  type: "customer",
  person: "Dana Ortiz",
  org: "Bright Home Care",
  date: "2026-10-08",
  segment: "Agencies with 10-50 caregivers",
  context: null,
  questionsAsked: null,
  observedBehavior: "Rebuilds the schedule in a spreadsheet every Friday",
  quotes: ["I lose my whole Friday afternoon to the schedule."],
  numbers: ["4 hours a week"],
  alternatives: "Spreadsheet plus group texts",
  urgency: null,
  buyingProcess: null,
  areas: ["problem"],
  followUps: [{ text: "Send the one-pager", due: "2026-10-12" }],
  whatChanges: null,
  notes: "Call notes.",
};

export const MENTOR: ConversationInput = {
  ...DANA,
  type: "mentor",
  person: "Chris Lee",
  org: null,
  segment: null,
  observedBehavior: null,
  quotes: [],
  numbers: [],
  alternatives: null,
  areas: [],
  followUps: [],
  notes: "Suggested starting with smaller agencies.",
};

export const PILOT: TestInput = {
  title: "Ask agency owners to pay for a scheduling pilot",
  area: "revenue",
  belief: "Agency owners will pay $200 a month to stop rebuilding schedules by hand",
  risk: "They feel the pain but won't pay for a new tool yet",
  test: "Offer a paid four-week pilot to five qualified agency owners",
  successCriteria: "At least two sign a paid pilot at $200 a month",
  failureCriteria: "None accept after five qualified offers",
  due: "2026-10-20",
  startNow: true,
};

/** One of each kind of contact detail a conversation's person must never hold. */
export const CONTACT_SAMPLES = {
  email: "Dana dana@bright.example",
  url: "https://bright.example/team",
  hostname: "Dana brighthomecare.com",
  phone: "Dana (704) 555-0182",
} as const;
