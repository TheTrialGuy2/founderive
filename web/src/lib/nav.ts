// Navigation config shared by client nav components and server pages.
import type { IconName } from "@/components/icons";

export const FOUNDER_NAV: { href: string; label: string; match?: string }[] = [
  { href: "/founder/today", label: "Today" },
  { href: "/founder/journey", label: "Journey" },
  { href: "/founder/programs/esc/sessions/5", label: "Program", match: "/founder/programs" },
  { href: "/founder/conversations", label: "Conversations" },
  { href: "/founder/mentors", label: "Mentors" },
  { href: "/founder/progress", label: "Progress" },
  { href: "/founder/capital", label: "Capital" },
  { href: "/founder/checkin", label: "Check-in" },
  { href: "/founder/settings/sharing", label: "Sharing" },
];

export const OPERATOR_NAV: { href: string; label: string; match?: string }[] = [
  { href: "/operator/overview", label: "Overview" },
  { href: "/operator/cohorts/esc-fall-26", label: "Cohort pulse", match: "/operator/cohorts" },
  { href: "/operator/founders/dana", label: "Founders", match: "/operator/founders" },
  { href: "/operator/programs/esc/builder", label: "Program builder", match: "/operator/programs" },
  { href: "/operator/capital", label: "Capital & reports" },
];

/** Phone tab bar: the four places founders go daily, plus quick-log in the middle. */
export const FOUNDER_TABS: { href: string; label: string; icon: IconName; match?: string; primary?: boolean }[] = [
  { href: "/founder/today", label: "Today", icon: "today" },
  { href: "/founder/programs/esc/sessions/5", label: "Program", icon: "program", match: "/founder/programs" },
  { href: "/founder/conversations/new", label: "Log", icon: "log", primary: true },
  { href: "/founder/progress", label: "Progress", icon: "progress" },
  { href: "/founder/more", label: "More", icon: "more", match: "/founder/more" },
];

export const MORE_LINKS = FOUNDER_NAV.filter((n) => !FOUNDER_TABS.some((t) => t.href === n.href));
