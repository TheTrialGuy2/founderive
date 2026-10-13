"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORKBOOK_NAV } from "@/lib/workbook-nav";

export function WorkbookNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0" aria-label="Workbook">
      <div className="flex items-center justify-between px-4 py-3 md:block md:px-5 md:pt-6 md:pb-4">
        <Image src="/founderive-wordmark.svg" alt="Founderive" width={132} height={29} priority />
        <p className="hidden text-[11px] font-medium tracking-[0.06em] text-muted uppercase md:mt-2 md:block">Founder operating record</p>
        <span className="rounded-full bg-aqua px-2 py-1 text-[10px] font-semibold text-teal-dark md:hidden">Your record</span>
      </div>
      <ul className="flex gap-1 overflow-x-auto border-t border-line/60 px-3 py-2 md:flex-col md:overflow-visible md:border-t-0">
        {WORKBOOK_NAV.map((item) => {
          if (!item.ready) {
            return (
              <li key={item.href}>
                <span aria-disabled="true" title="Coming soon" className="block cursor-default rounded-md px-3 py-2 text-sm whitespace-nowrap text-muted/50">
                  {item.label}
                </span>
              </li>
            );
          }
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-xl px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-navy font-semibold text-white shadow-sm" : "text-ink hover:bg-aqua/45"}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="hidden px-5 py-5 md:block">
        <Link href="/demo/founder/today" className="text-xs font-medium text-teal-dark hover:text-navy">
          View product demo →
        </Link>
      </div>
    </nav>
  );
}
