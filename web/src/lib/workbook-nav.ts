// Built sections only, grouped by the work a founder is doing. Each build step adds its section here.
export type NavItem = { href: string; label: string };
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Work", items: [{ href: "/today", label: "Today" }] },
  { label: "Record", items: [{ href: "/canvas", label: "Canvas" }] },
];
export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
