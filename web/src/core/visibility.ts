import type { FounderRecord, OperatorFounderView } from "@/data/types";

const LOCKED_SECTIONS = ["Conversations", "Contacts", "Notes", "Finances", "Mentor write-ups"];

/**
 * The operator's window into a founder: Program and Reported layers only. Fields are
 * allow-listed, so a new field stays out of this view until someone adds it here.
 *
 * This is a presentation contract, not a security boundary. The real build must build this
 * view server-side behind RLS, and scope it to the operator's program and the founder's
 * enrollment dates (Program layer = "that program's staff while enrolled").
 */
export function operatorView(record: FounderRecord): OperatorFounderView {
  const { founder } = record;
  return {
    founder: {
      id: founder.id,
      name: founder.name,
      ventureName: founder.ventureName,
      oneLiner: founder.oneLiner,
      city: founder.city,
      phase: founder.phase,
      ventureType: founder.ventureType,
      lastActivity: founder.lastActivity,
    },
    profile: founder.profile.filter((p) => p.layer === "program"),
    programProgress: { ...record.programProgress },
    mentorMeetings: record.mentorMeetings.map(({ id, date, status }) => ({ id, date, status })),
    reported: record.reported.map((r) => ({ ...r })),
    lockedSections: LOCKED_SECTIONS,
  };
}
