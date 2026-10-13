// Navigation config shared by client nav components and server pages.
import type { IconName } from "@/components/icons";

export const FOUNDER_NAV: { href: string; label: string; match?: string }[] = [
  { href: "/demo/founder/today", label: "Today" },
  { href: "/demo/founder/journey", label: "Journey" },
  { href: "/demo/founder/programs/esc/sessions/5", label: "Program", match: "/demo/founder/programs" },
  { href: "/demo/founder/conversations", label: "Conversations" },
  { href: "/demo/founder/mentors", label: "Mentors" },
  { href: "/demo/founder/progress", label: "Progress" },
  { href: "/demo/founder/capital", label: "Capital" },
  { href: "/demo/founder/checkin", label: "Check-in" },
  { href: "/demo/founder/settings/sharing", label: "Sharing" },
];

export const OPERATOR_NAV: { href: string; label: string; match?: string }[] = [
  { href: "/demo/operator/overview", label: "Overview" },
  { href: "/demo/operator/cohorts/esc-fall-26", label: "Cohort pulse", match: "/demo/operator/cohorts" },
  { href: "/demo/operator/founders/dana", label: "Founders", match: "/demo/operator/founders" },
  { href: "/demo/operator/programs/esc/builder", label: "Program builder", match: "/demo/operator/programs" },
  { href: "/demo/operator/capital", label: "Capital & reports" },
];

/** Phone tab bar: the four places founders go daily, plus quick-log in the middle. */
export const FOUNDER_TABS: { href: string; label: string; icon: IconName; match?: string; primary?: boolean }[] = [
  { href: "/demo/founder/today", label: "Today", icon: "today" },
  { href: "/demo/founder/programs/esc/sessions/5", label: "Program", icon: "program", match: "/demo/founder/programs" },
  { href: "/demo/founder/conversations/new", label: "Log", icon: "log", primary: true },
  { href: "/demo/founder/progress", label: "Progress", icon: "progress" },
  { href: "/demo/founder/more", label: "More", icon: "more", match: "/demo/founder/more" },
];

export const MORE_LINKS = FOUNDER_NAV.filter((n) => !FOUNDER_TABS.some((t) => t.href === n.href));
