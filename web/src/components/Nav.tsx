"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { FOUNDER_NAV, FOUNDER_TABS, OPERATOR_NAV } from "@/lib/nav";
import { useDemo } from "@/state/DemoStore";

const isFounderArea = (path: string) => path.startsWith("/demo/founder");

export function PersonaSwitch() {
  const isOperator = usePathname().startsWith("/demo/operator");
  const tab = (active: boolean) => `whitespace-nowrap rounded-full px-3 py-1 ${active ? "bg-lime text-navy" : "text-white/80 hover:text-white"}`;
  return (
    <div className="flex rounded-full bg-white/10 p-0.5" aria-label="Switch persona">
      <Link href="/demo/founder/today" className={tab(!isOperator)}>
        Founder
      </Link>
      <Link href="/demo/operator/overview" className={tab(isOperator)}>
        <span className="hidden sm:inline">Program </span>team
      </Link>
    </div>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const { basics } = useDemo();
  if (pathname.startsWith("/demo/onboarding")) return null;
  const isOperator = pathname.startsWith("/demo/operator");
  const nav = isOperator ? OPERATOR_NAV : FOUNDER_NAV;

  return (
    // Founders get the bottom tab bar on phones, so their side nav is desktop-only.
    <nav className={`${isOperator ? "border-b" : "hidden md:block"} border-line bg-paper md:w-56 md:shrink-0 md:border-r md:border-b-0`}>
      <div className="hidden px-5 pt-5 pb-3 md:block">
        <Image src="/founderive-wordmark.svg" alt="founderive" width={120} height={26} />
        <p className="mt-2 text-xs text-muted">{isOperator ? "Program team" : `${basics.name} · ${basics.ventureName}`}</p>
      </div>
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-col md:overflow-visible">
        {nav.map((item) => {
          const active = pathname.startsWith(item.match ?? item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-navy font-medium text-white" : "text-ink hover:bg-sand/60"}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function FounderTabBar() {
  const pathname = usePathname();
  if (!isFounderArea(pathname)) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur md:hidden" aria-label="Founder tabs">
      <ul className="mx-auto flex max-w-md items-end justify-between px-4 pt-1.5 pb-3">
        {FOUNDER_TABS.map((t) => {
          const active = pathname.startsWith(t.match ?? t.href);
          return (
            <li key={t.href}>
              <Link href={t.href} className="flex flex-col items-center gap-0.5 text-[11px]">
                <span
                  className={`flex items-center justify-center ${
                    t.primary ? "-mt-5 h-12 w-12 rounded-full bg-navy text-lime shadow-lg" : `h-6 ${active ? "text-navy" : "text-muted"}`
                  }`}
                >
                  <Icon name={t.icon} size={t.primary ? 24 : 20} />
                </span>
                <span className={active ? "font-medium text-navy" : "text-muted"}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop quick-log button, always one click from logging a conversation. */
export function QuickLog() {
  const pathname = usePathname();
  if (!isFounderArea(pathname) || pathname === "/demo/founder/conversations/new") return null;
  return (
    <Link
      href="/demo/founder/conversations/new"
      className="fixed right-8 bottom-8 z-20 hidden h-14 w-14 items-center justify-center rounded-full bg-navy text-lime shadow-lg hover:bg-navy-light md:flex"
      aria-label="Log a conversation"
      title="Log a conversation"
    >
      <Icon name="log" size={28} />
    </Link>
  );
}

