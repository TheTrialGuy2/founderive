// Shared inputs for command tests. Not a test file itself.
import type { ConversationInput } from "./conversations";

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
