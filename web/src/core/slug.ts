import { isoDate, kindOf } from "../store/schemas";

const MAX_SLUG = 48;
const DATED_SLUG = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Lowercase letters, digits and single hyphens, cut at a word boundary. Never empty. */
export function slugify(text: string, max = MAX_SLUG): string {
  const base = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) return "entry";
  if (base.length <= max) return base;
  const cut = base.slice(0, max);
  const lastHyphen = cut.lastIndexOf("-");
  return lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut;
}

/** `<dir>/<date>-<slug>.md`. Attempt 2 and up add `-2`, `-3` … so a second entry with the same title and date gets its own file. */
export function datedPath(dir: string, date: string, title: string, attempt = 1): string {
  if (!isoDate.safeParse(date).success) throw new Error(`${date} isn't a real date as YYYY-MM-DD.`);
  return `${dir}/${date}-${slugify(title)}${attempt > 1 ? `-${attempt}` : ""}.md`;
}

/** The URL slug of a dated record: its file name without `.md`. */
export function slugOf(rel: string): string {
  return rel.slice(rel.lastIndexOf("/") + 1).replace(/\.md$/, "");
}

/** The founder-data path for a URL slug, or null when the slug isn't a dated entry name (so a crafted URL can't reach other files). */
export function pathForSlug(dir: string, slug: string): string | null {
  return DATED_SLUG.test(slug) && isoDate.safeParse(slug.slice(0, 10)).success ? `${dir}/${slug}.md` : null;
}

/** The page that shows a record, when it has one. */
export function hrefFor(rel: string): string | null {
  const kind = kindOf(rel);
  if (kind === "conversation") return `/conversations/${slugOf(rel)}`;
  if (kind === "test") return `/tests/${slugOf(rel)}`;
  if (kind === "decision") return "/decisions";
  if (kind === "canvasBlock") return `/canvas/${slugOf(rel)}`;
  if (kind === "founder") return "/setup";
  return null;
}
