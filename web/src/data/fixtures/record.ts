import type {
  CapitalIntro,
  CapitalPartner,
  Conversation,
  FollowUp,
  Mentor,
  MentorMeeting,
  Metric,
  Milestone,
  Observation,
  Outcome,
  ReadinessCriterion,
  ReportedField,
} from "@/data/types";

// ---- Conversations ------------------------------------------------------------

const brief = (
  n: number,
  withName: string,
  org: string,
  occurredAt: string,
  newFact: string,
  relationship: Conversation["relationship"] = "cold",
): Conversation => ({
  id: `conv-${n}`,
  founderId: "dana",
  type: "customer_discovery",
  with: withName,
  org,
  relationship,
  occurredAt,
  newFact,
  whatThisChanges: [],
  quotes: [],
  numbers: [],
  contaminationFlags: [],
  followUps: [],
});

const followUp = (id: string, title: string, owner: FollowUp["owner"], who: string, dueAt: string): FollowUp => ({
  id,
  title,
  owner,
  who,
  dueAt,
  status: "open",
});

export const conversations: Conversation[] = [
  brief(1, "Rosa Reyes", "Retired home-care nurse", "2026-08-04", "Caregivers trade shifts in a family group chat the agency never sees.", "family"),
  brief(2, "Kevin L.", "Keystone Comfort Care", "2026-08-07", "Owner spends ~6 hrs/week personally covering no-shows."),
  brief(3, "Tasha M.", "Hearthside Home Care", "2026-08-11", "Scheduler keeps a paper backup because the EVV app crashes."),
  brief(4, "Daniel P.", "Carolina Companions", "2026-08-14", "They tried a big-vendor scheduler; dropped it over per-caregiver pricing."),
  brief(5, "Ana S.", "Sunrise Care Partners", "2026-08-19", "Text chains are the system. Nobody wants another login."),
  brief(6, "Monique R.", "Grace Home Health", "2026-08-21", "Owner, not scheduler, signs every software contract."),
  brief(7, "Phil T.", "Piedmont Senior Care", "2026-08-26", "Overtime from uncovered shifts is the #2 cost after payroll."),
  brief(8, "Jen W.", "Lakeside Caregivers", "2026-08-28", "Would trial if it works inside text messages."),
  brief(9, "Carlos D.", "Queen City Care", "2026-09-02", "Lost a 20-hour client after three missed visits in a month."),
  brief(10, "Beth H.", "Harbor Home Assist", "2026-09-04", "Pays $1.20/caregiver/month for current app and hates it."),
  brief(11, "Ike O.", "Unity Home Care", "2026-09-09", "Schedulers burn out in under a year; owners know it."),
  {
    ...brief(12, "Renee F.", "Oakwood Caregivers", "2026-09-30", "Owner would pay if it cut overtime, not for convenience."),
    quotes: ["“Convenience doesn't get a budget line. Overtime does.”"],
    numbers: [{ label: "Monthly overtime", value: "~$4,800" }],
  },
  {
    ...brief(13, "Marcus J.", "Hearthstone Agency", "2026-10-08", "Pricing per agency, not per caregiver, removes their #1 objection.", "referred"),
    whatThisChanges: ["Revenue model: test flat per-agency pricing", "Assumption “per-seat is fine” → contradicted"],
    quotes: ["“Every time I hire, my software bill goes up. That's backwards.”"],
    numbers: [{ label: "Caregivers", value: "62" }, { label: "Willing to pay", value: "$300–500/mo flat" }],
    followUps: [followUp("fu-1", "Send one-page pilot terms", "founder", "Marcus J.", "2026-10-14")],
  },
  {
    ...brief(14, "Priscilla N.", "Bright Days Home Care", "2026-10-10", "The scheduler is the champion; the owner is the buyer. Two different pitches.", "warm"),
    whatThisChanges: ["Customer: buyer (owner) ≠ user (scheduler)", "Focus question sharpened"],
    quotes: ["“I'd use it tomorrow. Getting Linda to sign is a different meeting.”"],
    numbers: [{ label: "Open shifts / week", value: "15–20" }],
    followUps: [followUp("fu-2", "Intro to owner (Linda)", "other", "Priscilla N.", "2026-10-09")],
  },
  {
    id: "conv-m1",
    founderId: "dana",
    type: "mentor",
    with: "Mentor team",
    org: "Mentor Program",
    relationship: "warm",
    occurredAt: "2026-09-24",
    newFact: "Mentors pushed to test flat pricing before building more features.",
    whatThisChanges: ["Next build paused until 5 pricing conversations"],
    quotes: [],
    numbers: [],
    contaminationFlags: [],
    followUps: [followUp("fu-3", "Intro to a home-health CFO", "other", "Marcus Bell (mentor)", "2026-10-01")],
  },
  {
    id: "conv-p1",
    founderId: "dana",
    type: "peer",
    with: "Lucía Ortiz",
    org: "Cohort peer · Mesa Verde",
    relationship: "warm",
    occurredAt: "2026-10-06",
    newFact: "Shift-change timing matters for her customers too. Possible referral partner.",
    whatThisChanges: [],
    quotes: [],
    numbers: [],
    contaminationFlags: [],
    followUps: [],
  },
];

// ---- Outcomes, metrics, milestones --------------------------------------------

export const outcomes: Outcome[] = [
  { id: "o1", title: "Prove agency owners will pay", why: "The focus question. Everything else waits on it." },
  { id: "o2", title: "Run a working pilot", why: "Schedulers have to use it weekly, or the owner won't renew." },
];

export const metrics: Metric[] = [
  {
    id: "m-interviews",
    outcomeId: "o1",
    name: "Customer interviews",
    definition: "Discovery conversations with agency owners or schedulers.",
    unit: "conversations",
    kind: "count",
    countingRule: { type: "customer_discovery", excludeRelationships: ["friend", "family"] },
    baseline: 0,
    baselineAt: "2026-08-01",
    target: 15,
    targetAt: "2026-11-17",
  },
  {
    id: "m-pilots",
    outcomeId: "o1",
    name: "Agencies on paid pilot",
    definition: "Agencies paying any amount for a pilot. Friends and family excluded.",
    unit: "agencies",
    kind: "latest",
    baseline: 0,
    baselineAt: "2026-08-01",
    target: 3,
    targetAt: "2026-11-17",
  },
  {
    id: "m-wau",
    outcomeId: "o2",
    name: "Weekly active schedulers",
    definition: "Schedulers who posted or filled a shift in the last 7 days. Test accounts excluded.",
    unit: "schedulers",
    kind: "latest",
    baseline: 0,
    baselineAt: "2026-09-15",
    target: 20,
    targetAt: "2026-12-15",
  },
];

export const observations: Observation[] = [
  { id: "ob-1", metricId: "m-pilots", value: 1, observedAt: "2026-09-20", source: "Signed pilot: Harbor Home Assist" },
  {
    id: "ob-2",
    metricId: "m-pilots",
    value: 2,
    observedAt: "2026-10-01",
    source: "Signed pilot: Reyes Family Care",
    retractedReason: "Run by a cousin, so it's excluded under the friends-and-family rule.",
  },
  { id: "ob-3", metricId: "m-pilots", value: 1, observedAt: "2026-10-02", source: "Corrected count after retraction" },
  { id: "ob-4", metricId: "m-wau", value: 6, observedAt: "2026-09-28", source: "Product analytics export" },
  { id: "ob-5", metricId: "m-wau", value: 9, observedAt: "2026-10-09", source: "Product analytics export" },
];

export const milestones: Milestone[] = [
  { id: "ms-1", title: "15 customer interviews with agency owners", halfwayCheck: "8 by Oct 13", status: "on_track", dueAt: "2026-11-17" },
  { id: "ms-2", title: "3 agencies on a paid pilot", halfwayCheck: "1 signed by Oct 13", status: "on_track", dueAt: "2026-11-17" },
  { id: "ms-3", title: "Pricing tested with 5 agencies", halfwayCheck: "2 tested by Oct 13", status: "behind", dueAt: "2026-11-17" },
];

// ---- Mentors ------------------------------------------------------------------

export const mentors: Mentor[] = [
  { name: "Marcus Bell", role: "Former COO, regional home-health group", domain: "Operations · agency buyers" },
  { name: "Priya Nair", role: "VP Sales, vertical SaaS", domain: "Pricing · sales motion" },
  { name: "Tom Alvarez", role: "CPA, small-business practice", domain: "Finance · unit economics" },
];

export const mentorMeetings: MentorMeeting[] = [
  {
    id: "mm-1",
    date: "2026-09-24",
    status: "held",
    writeup: {
      said: [
        "Priya: price per agency, not per caregiver. Owners hate bills that grow with headcount.",
        "Marcus: the owner buys on overtime saved. Lead with that number.",
        "Tom: know your cost to serve one agency before you quote.",
      ],
      homework: ["Run 5 pricing conversations before building more features", "Estimate cost to serve one agency"],
      changes: ["Feature work paused", "Milestone 3 added: pricing tested with 5 agencies"],
    },
  },
  { id: "mm-2", date: "2026-10-22", status: "upcoming" },
];

// ---- Capital ------------------------------------------------------------------

export const readinessCriteria: ReadinessCriterion[] = [
  { key: "idea", name: "Idea", question: "Is the problem real and painful?", required: 2, evidence: ["Problem statement (record)"] },
  { key: "innovation", name: "Innovation", question: "What's new about the approach?", required: 2, evidence: ["Competitor map (Session 3)"] },
  { key: "opportunity", name: "Business opportunity", question: "Is there a business here?", required: 2, evidence: ["Pricing signal: $300–500/mo flat"] },
  // Momentum's evidence is computed from recent conversations, not listed here.
  { key: "momentum", name: "Momentum", question: "What moved in the last 30 days?", required: 4, evidence: [] },
  { key: "team", name: "Team", question: "Can this team execute?", required: 2, evidence: ["Founder profile", "Mentor team of 3"] },
  { key: "use_of_funds", name: "Use of funds", question: "Where does each dollar go?", required: 1, evidence: [] },
  { key: "impact", name: "Grant impact", question: "What will the grant change?", required: 1, evidence: [] },
];

export const capitalPartners: CapitalPartner[] = [
  { id: "qca", name: "Queen City Angels", kind: "angel_fund", checkSize: "$50K–$250K", fit: "Software and health-adjacent, NC-based, post-pilot", minSupported: 6 },
  { id: "summit", name: "Southeast Seed Summit", kind: "pitch_event", checkSize: "$100K pitch prize", fit: "Growth ventures with early traction", minSupported: 5 },
  { id: "micro", name: "NC IDEA MICRO", kind: "grant", checkSize: "$10K", fit: "Customer discovery underway, testing assumptions", minSupported: 3 },
];

export const capitalIntros: CapitalIntro[] = [
  { id: "ci-1", founderId: "kwame", partnerId: "qca", stage: "meeting", updatedAt: "2026-10-05" },
  { id: "ci-2", founderId: "maya", partnerId: "qca", stage: "invested", updatedAt: "2026-08-30" },
  { id: "ci-3", founderId: "elena", partnerId: "summit", stage: "made", updatedAt: "2026-09-28" },
  { id: "ci-4", founderId: "devon", partnerId: "qca", stage: "passed", updatedAt: "2026-09-12" },
  { id: "ci-5", founderId: "omar", partnerId: "micro", stage: "requested", updatedAt: "2026-10-09" },
  { id: "ci-6", founderId: "lucia", partnerId: "micro", stage: "opted_in", updatedAt: "2026-10-11" },
];

// ---- Reported layer -----------------------------------------------------------

export const reportedFields: ReportedField[] = [
  { key: "stage", label: "Stage", value: "Pilot with paying customer", source: "Venture record", verification: "self_reported" },
  { key: "customers", label: "Paying customers", value: "1", source: "Metric: agencies on paid pilot", verification: "document_verified", numeric: 1 },
  { key: "revenue", label: "Revenue to date", value: "$800", source: "Payment processor export", verification: "document_verified" },
  { key: "jobs", label: "Jobs", value: "1 full-time founder · 1 part-time contractor", source: "Team record", verification: "self_reported", numeric: 2 },
  { key: "capital", label: "Capital raised", value: "$12,000 (founder cash $7K · prize $5K)", source: "Funding history", verification: "self_reported", numeric: 12000 },
  { key: "programs", label: "Programs completed", value: "Customer Discovery Lab", source: "Journey", verification: "document_verified" },
];

// ---- Private layer (founder only) ---------------------------------------------

export const privateNotes = {
  contacts: ["24 agency owners and schedulers", "3 mentors", "2 cohort peers"],
  notes: ["Considering hiring a part-time sales contractor in January."],
  finances: [
    { label: "Runway", value: "7 months" },
    { label: "Monthly burn", value: "$1,900" },
  ],
};
