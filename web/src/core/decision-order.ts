import { PAGE_SIZE } from "../lib/pagination";
import { slugOf } from "./slug";

/** Decisions are listed newest first, ties by path. Home's links and the page must agree, so both sort with this. */
export const byNewestDecision = (a: { path: string; data: { date: string } }, b: { path: string; data: { date: string } }): number =>
  b.data.date.localeCompare(a.data.date) || a.path.localeCompare(b.path);

/** The page and card anchor of the decision at `index` in that order. */
export function decisionHref(index: number, rel: string): string {
  const page = Math.floor(index / PAGE_SIZE) + 1;
  return `/decisions${page > 1 ? `?page=${page}` : ""}#${slugOf(rel)}`;
}
