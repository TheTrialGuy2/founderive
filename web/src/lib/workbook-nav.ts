// The workbook's menu. Home holds the path, so step pages and the canvas grid highlight Home.
export type NavItem = { href: string; label: string; match?: string[] };
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workbook",
    items: [
      { href: "/today", label: "Home", match: ["/path", "/canvas"] },
      { href: "/people", label: "People", match: ["/conversations"] },
      { href: "/logged", label: "Everything logged", match: ["/tests", "/decisions"] },
    ],
  },
];
const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
export const isActive = (pathname: string, item: NavItem) => under(pathname, item.href) || (item.match ?? []).some((m) => under(pathname, m));
