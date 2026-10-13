// Workbook sections in nav order. `ready` flips to true as each build step ships a section.
export const WORKBOOK_NAV: { href: string; label: string; ready: boolean }[] = [
  { href: "/today", label: "Today", ready: true },
  { href: "/timeline", label: "Timeline", ready: false },
  { href: "/program", label: "Program", ready: false },
  { href: "/plan", label: "Plan", ready: false },
  { href: "/me", label: "Me", ready: false },
  { href: "/canvas", label: "Canvas", ready: false },
  { href: "/pitch", label: "Pitch", ready: false },
  { href: "/market", label: "Market", ready: false },
  { href: "/conversations", label: "Conversations", ready: false },
  { href: "/progress", label: "Progress", ready: false },
  { href: "/files", label: "Files", ready: false },
];
