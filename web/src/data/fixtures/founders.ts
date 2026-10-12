import type { CohortMember, Founder, Phase } from "@/data/types";

export const dana: Founder = {
  id: "dana",
  name: "Dana Reyes",
  ventureName: "Tandem",
  oneLiner: "Shift coordination for small home-care agencies: fill open shifts without the 6am text chain.",
  city: "Charlotte",
  phase: "early",
  ventureType: "growth",
  cohortId: "esc-fall-26",
  programIds: ["esc", "mentor"],
  completedProgramIds: ["cdl"],
  lastActivity: "2026-10-12",
  focusQuestion: "Will agency owners pay for scheduling, or only the schedulers who feel the pain?",
  profile: [
    {
      key: "need",
      question: "Why do you need to build this company, rather than simply wanting to?",
      answer:
        "I ran scheduling for a 40-caregiver agency for six years. I watched good caregivers quit over last-minute texts. I can't unsee it.",
      layer: "program",
    },
    {
      key: "positioned",
      question: "Why are you specifically positioned to solve this problem?",
      answer: "I've done the job. I know the owners, the state rules on visit verification, and what schedulers actually tolerate.",
      layer: "program",
    },
    {
      key: "life",
      question: "What kind of company and life are you actually trying to build?",
      answer: "A venture-scale company if the pilots prove out; a profitable regional business if they don't. I'll decide by spring.",
      layer: "program",
    },
    {
      key: "limitation",
      question: "What is one of your real founder limitations?",
      answer: "I avoid pricing conversations. I discount before anyone asks.",
      layer: "private",
    },
    {
      key: "challenge",
      question: "Who can challenge you, and what makes you listen?",
      answer: "My former agency owner. She told me the first prototype was a spreadsheet with a logo, and she was right.",
      layer: "program",
    },
  ],
};

const cohortFounder = (
  id: string,
  name: string,
  ventureName: string,
  oneLiner: string,
  lastActivity: string,
  ventureType: Founder["ventureType"] = "main_street",
): Founder => ({
  id,
  name,
  ventureName,
  oneLiner,
  city: "Charlotte",
  phase: "early",
  ventureType,
  cohortId: "esc-fall-26",
  programIds: ["esc"],
  completedProgramIds: [],
  lastActivity,
  focusQuestion: "",
  profile: [],
});

const otherFounder = (id: string, name: string, ventureName: string, oneLiner: string, phase: Phase, programIds: string[], lastActivity: string): Founder => ({
  id,
  name,
  ventureName,
  oneLiner,
  city: "Charlotte",
  phase,
  ventureType: "growth",
  cohortId: null,
  programIds,
  completedProgramIds: phase === "idea" ? [] : ["cdl"],
  lastActivity,
  focusQuestion: "",
  profile: [],
});

export const founders: Founder[] = [
  dana,
  cohortFounder("marcus", "Marcus Webb", "Webb & Grain", "Wholesale sourdough for neighborhood cafés.", "2026-10-11"),
  cohortFounder("aisha", "Aisha Karim", "LedgerLeaf", "Bookkeeping built for hair and beauty salons.", "2026-10-09", "growth"),
  cohortFounder("ben", "Ben Okafor", "Courtside", "After-school basketball skills clinics.", "2026-10-02"),
  cohortFounder("lucia", "Lucía Ortiz", "Mesa Verde", "Meal-prep for shift workers, delivered at shift change.", "2026-10-10"),
  cohortFounder("sam", "Sam Patel", "Fleetly", "Maintenance alerts for small delivery fleets.", "2026-09-22", "growth"),
  cohortFounder("grace", "Grace Kim", "Thread & Needle", "Alteration pickup for busy professionals.", "2026-10-12"),
  cohortFounder("jordan", "Jordan Hayes", "Pawsitive", "Dog-walking marketplace for apartment complexes.", "2026-09-25"),
  cohortFounder("nia", "Nia Brooks", "StoopFest", "Block-party kits for neighborhood associations.", "2026-10-03"),
  cohortFounder("omar", "Omar Haddad", "QuietRoom", "Bookable focus pods in co-working spaces.", "2026-10-08", "growth"),
  otherFounder("ruth", "Ruth Adeyemi", "Kinship Care Co.", "Respite care matching for family caregivers.", "idea", ["cdl"], "2026-10-11"),
  otherFounder("leo", "Leo Martins", "Gridline", "Permit tracking for small contractors.", "idea", ["cdl"], "2026-10-07"),
  otherFounder("hana", "Hana Suzuki", "Sprout Labs", "STEM kits for after-school programs.", "idea", ["cdl"], "2026-09-20"),
  otherFounder("chris", "Chris Daniels", "Brightline HVAC", "Subscription HVAC maintenance for landlords.", "idea", [], "2026-10-12"),
  otherFounder("maya", "Maya Thompson", "Clearpath Health", "Prior-authorization tracking for independent clinics.", "validation", ["mentor"], "2026-10-09"),
  otherFounder("devon", "Devon Price", "Rally", "Volunteer scheduling for youth sports leagues.", "validation", ["mentor"], "2026-09-30"),
  otherFounder("elena", "Elena Vasquez", "Porchlight", "Home-safety retrofits for aging in place.", "validation", ["mentor"], "2026-10-06"),
  otherFounder("kwame", "Kwame Mensah", "Voltwise", "Energy audits for small manufacturers.", "capital", ["mentor", "capital"], "2026-10-10"),
];

/** Cohort table rows for everyone except Dana, whose row is computed from the live record. */
export const cohortMembers: CohortMember[] = [
  { founderId: "marcus", stepsDone: 10, stepsTotal: 21, mentorMeetingsHeld: 0, halfway: "on_track", checkin: "verified", activeWeeks: [false, true, true, true, true] },
  { founderId: "aisha", stepsDone: 9, stepsTotal: 21, mentorMeetingsHeld: 0, halfway: "on_track", checkin: "verified", activeWeeks: [false, true, true, false, true] },
  { founderId: "ben", stepsDone: 6, stepsTotal: 21, mentorMeetingsHeld: 0, halfway: "behind", checkin: "confirmed", activeWeeks: [false, false, true, true, false] },
  { founderId: "lucia", stepsDone: 9, stepsTotal: 21, mentorMeetingsHeld: 0, halfway: "on_track", checkin: "verified", activeWeeks: [false, true, true, true, true] },
  { founderId: "sam", stepsDone: 4, stepsTotal: 21, mentorMeetingsHeld: 0, halfway: "not_started", checkin: "pending", activeWeeks: [false, false, false, true, true] },
  { founderId: "grace", stepsDone: 11, stepsTotal: 21, mentorMeetingsHeld: 0, halfway: "on_track", checkin: "verified", activeWeeks: [true, true, true, true, true] },
  { founderId: "jordan", stepsDone: 5, stepsTotal: 21, mentorMeetingsHeld: 0, halfway: "behind", checkin: "confirmed", activeWeeks: [false, false, false, true, false] },
  { founderId: "nia", stepsDone: 7, stepsTotal: 21, mentorMeetingsHeld: 0, halfway: "on_track", checkin: "confirmed", activeWeeks: [false, false, true, true, true] },
  { founderId: "omar", stepsDone: 8, stepsTotal: 21, mentorMeetingsHeld: 0, halfway: "on_track", checkin: "verified", activeWeeks: [false, true, true, false, true] },
];

/** Reported-layer outcomes per founder, as confirmed at their last check-in. */
export const founderOutcomes: Record<string, { payingCustomers: number; capitalRaised: number; jobs: number; verified: boolean }> = {
  marcus: { payingCustomers: 4, capitalRaised: 8000, jobs: 2, verified: true },
  aisha: { payingCustomers: 2, capitalRaised: 0, jobs: 1, verified: true },
  ben: { payingCustomers: 0, capitalRaised: 1500, jobs: 1, verified: false },
  lucia: { payingCustomers: 11, capitalRaised: 5000, jobs: 3, verified: true },
  grace: { payingCustomers: 6, capitalRaised: 0, jobs: 1, verified: true },
  jordan: { payingCustomers: 0, capitalRaised: 0, jobs: 1, verified: false },
  nia: { payingCustomers: 1, capitalRaised: 2500, jobs: 1, verified: false },
  omar: { payingCustomers: 0, capitalRaised: 25000, jobs: 2, verified: true },
  ruth: { payingCustomers: 0, capitalRaised: 0, jobs: 1, verified: false },
  leo: { payingCustomers: 0, capitalRaised: 0, jobs: 1, verified: false },
  chris: { payingCustomers: 3, capitalRaised: 0, jobs: 2, verified: false },
  maya: { payingCustomers: 2, capitalRaised: 60000, jobs: 3, verified: true },
  devon: { payingCustomers: 9, capitalRaised: 10000, jobs: 2, verified: false },
  elena: { payingCustomers: 5, capitalRaised: 35000, jobs: 4, verified: true },
  kwame: { payingCustomers: 7, capitalRaised: 150000, jobs: 5, verified: true },
};
