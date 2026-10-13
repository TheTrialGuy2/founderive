"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandWordmark } from "@/components/BrandWordmark";
import { routePattern } from "@/lib/feedback";
import { isActive, NAV_GROUPS } from "@/lib/workbook-nav";

export function WorkbookNav() {
  const pathname = usePathname();
  // The route pattern only (/tests/…), never the record's slug, so feedback can't carry a name or title.
  const feedbackHref = `/feedback?from=${encodeURIComponent(routePattern(pathname))}`;
  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0" aria-label="Workbook">
      <div className="flex items-center justify-between px-4 py-3 md:block md:px-5 md:pt-6 md:pb-4">
        <BrandWordmark />
        <p className="hidden text-[11px] font-medium tracking-[0.06em] text-muted uppercase md:mt-2 md:block">Founder operating record</p>
        <Link href={feedbackHref} className="text-xs font-medium text-teal-dark hover:text-navy md:hidden">
          Send feedback
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto border-t border-line/60 px-3 py-2 md:block md:space-y-4 md:overflow-visible md:border-t-0">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="hidden px-3 pb-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase md:block">{group.label}</p>
            <ul className="flex gap-1 md:flex-col">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-navy font-semibold text-white" : "text-ink hover:bg-aqua/45"}`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="hidden space-y-1 px-5 py-5 md:block">
        <Link href="/setup" className="block text-xs font-medium text-teal-dark hover:text-navy">
          Venture setup
        </Link>
        <Link href={feedbackHref} className="block text-xs font-medium text-teal-dark hover:text-navy">
          Send feedback
        </Link>
        <Link href="/demo/founder/today" className="block text-xs font-medium text-teal-dark hover:text-navy">
          View product demo →
        </Link>
      </div>
    </nav>
  );
}
