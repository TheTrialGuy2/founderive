"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORKBOOK_NAV } from "@/lib/workbook-nav";

export function WorkbookNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-line bg-paper md:w-56 md:shrink-0 md:border-r md:border-b-0" aria-label="Workbook">
      <div className="hidden px-5 pt-5 pb-3 md:block">
        <Image src="/founderive-wordmark.svg" alt="founderive" width={120} height={26} />
      </div>
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-col md:overflow-visible">
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
                className={`block rounded-md px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-navy font-medium text-white" : "text-ink hover:bg-sand/60"}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="hidden px-5 py-4 md:block">
        <Link href="/demo/founder/today" className="text-xs text-muted hover:text-navy">
          Demo
        </Link>
      </div>
    </nav>
  );
}
