export const PAGE_SIZE = 10;

export type PageSlice<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
};

/** Query-string page values are untrusted. Invalid values return to page 1. */
export function pageNumber(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

/** Slice a list and clamp stale page links to the last page that still has records. */
export function paginate<T>(items: T[], requestedPage: number, pageSize = PAGE_SIZE): PageSlice<T> {
  const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * size;
  const pageItems = items.slice(start, start + size);
  return {
    items: pageItems,
    page,
    pageCount,
    total: items.length,
    from: pageItems.length === 0 ? 0 : start + 1,
    to: start + pageItems.length,
  };
}

/** Build a pagination link without dropping the screen's active filters. */
export function pageHref(pathname: string, params: Record<string, string | undefined>, pageKey: string, page: number): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  if (page > 1) query.set(pageKey, String(page));
  else query.delete(pageKey);
  const suffix = query.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
