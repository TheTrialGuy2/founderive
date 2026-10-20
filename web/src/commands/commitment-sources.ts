import { parseSourceLink, sortLinkedCommitments, sourceLabel, type CommitmentSource, type LinkedCommitment } from "../core/commitment-source";
import { byNewestDecision, decisionHref } from "../core/decision-order";
import { slugOf } from "../core/slug";
import { listEntries, readEntry } from "../store/read";
import { weekOfCheckinPath } from "./checkin";

/**
 * The label and page for each distinct source link, read once each. A link that isn't a source, or whose record is
 * missing or can't be read, has no entry: the commitment stays on Home without its line, and check-data carries the
 * warning. Decisions are looked up in their page order so the anchor lands on the right page.
 */
export async function resolveCommitmentSources(links: (string | null | undefined)[]): Promise<Map<string, CommitmentSource>> {
  const parsed = new Map<string, ReturnType<typeof parseSourceLink>>();
  for (const link of links) if (link && !parsed.has(link)) parsed.set(link, parseSourceLink(link));
  const out = new Map<string, CommitmentSource>();
  const wantsDecision = [...parsed.values()].some((p) => p?.kind === "decision");
  const decisions = wantsDecision ? (await listEntries("decision")).flatMap((e) => (e.ok ? [e] : [])).sort(byNewestDecision) : [];
  await Promise.all(
    [...parsed].map(async ([link, p]) => {
      if (!p) return;
      if (p.kind === "conversation") {
        const e = await readEntry("conversation", p.path);
        if (e?.ok) out.set(link, { label: sourceLabel("conversation", e.data.person), href: `/conversations/${slugOf(p.path)}` });
      } else if (p.kind === "test") {
        const e = await readEntry("test", p.path);
        if (e?.ok) out.set(link, { label: sourceLabel("test", e.data.title), href: `/tests/${slugOf(p.path)}` });
      } else {
        const index = decisions.findIndex((d) => d.path === p.path);
        if (index >= 0) out.set(link, { label: sourceLabel("decision", decisions[index].data.title), href: decisionHref(index, p.path) });
      }
    }),
  );
  return out;
}

/**
 * Every readable check-in's commitments that name a source record, grouped by link and sorted for display. Repeating
 * definitions are skipped (their weekly instances are ordinary commitments and are kept). Read once per page, not per card.
 */
export async function loadLinkedCommitments(): Promise<Map<string, LinkedCommitment[]>> {
  const grouped = new Map<string, LinkedCommitment[]>();
  for (const entry of await listEntries("checkin")) {
    if (!entry.ok) continue;
    const week = weekOfCheckinPath(entry.path);
    for (const c of entry.data.commitments) {
      if (c.repeat || !c.link || !parseSourceLink(c.link)) continue;
      const list = grouped.get(c.link) ?? [];
      list.push({ week, id: c.id, text: c.text, due: c.due ?? null, status: c.status, reason: c.reason ?? null });
      grouped.set(c.link, list);
    }
  }
  for (const [link, list] of grouped) grouped.set(link, sortLinkedCommitments(list));
  return grouped;
}

/** The commitments made from one record, for its page. */
export async function linkedCommitmentsFor(path: string): Promise<LinkedCommitment[]> {
  return (await loadLinkedCommitments()).get(path) ?? [];
}
