import Link from "next/link";
import type { PageSlice } from "@/lib/pagination";

type PaginationProps = Pick<PageSlice<unknown>, "page" | "pageCount" | "total" | "from" | "to"> & {
  itemLabel: string;
  hrefForPage: (page: number) => string;
};

function visiblePages(page: number, pageCount: number): number[] {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

const linkBase = "inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium";
const linkClass = `${linkBase} border-line bg-paper text-teal-dark hover:border-teal-dark hover:text-navy`;
const currentLinkClass = `${linkBase} border-navy bg-navy text-white hover:bg-navy-light`;
const disabledClass = "inline-flex min-h-9 items-center justify-center rounded-md border border-line px-3 text-sm text-muted opacity-55";

export function Pagination({ page, pageCount, total, from, to, itemLabel, hrefForPage }: PaginationProps) {
  if (total === 0 || pageCount <= 1) return null;
  const pages = visiblePages(page, pageCount);
  return (
    <nav aria-label={`${itemLabel} pages`} className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        Showing {from}–{to} of {total} {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} rel="prev" className={linkClass}>
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>Previous</span>
        )}
        {pages.map((number) => (
          <Link key={number} href={hrefForPage(number)} aria-current={number === page ? "page" : undefined} aria-label={`Page ${number}`} className={number === page ? currentLinkClass : linkClass}>
            {number}
          </Link>
        ))}
        {page < pageCount ? (
          <Link href={hrefForPage(page + 1)} rel="next" className={linkClass}>
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>Next</span>
        )}
      </div>
    </nav>
  );
}
