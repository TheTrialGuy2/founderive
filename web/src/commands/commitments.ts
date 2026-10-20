import { parseSourceLink } from "../core/commitment-source";
import { readEntry } from "../store/read";
import { isoDate } from "../store/schemas";
import { addCommitment } from "./checkin";

/**
 * A commitment made on a conversation, decision or test: the record's path travels in `link`, so Home can say where it
 * came from and the record can list it. The source must be a record Founderive knows, present and readable; nothing is
 * written to it. The week guard (`assertThisWeek`) belongs to the server action, not here.
 */
export async function addLinkedCommitment(weekId: string, input: { text: string; due: string | null; link: string }): Promise<string> {
  const source = parseSourceLink(input.link);
  if (!source) throw new Error("The commitment wasn't saved because this record isn't one Founderive can link to. Reload the page.");
  const text = input.text.trim();
  if (!text) throw new Error("Write what you'll do.");
  const due = (input.due ?? "").trim();
  if (due && !isoDate.safeParse(due).success) throw new Error("Use a real date.");
  const entry = await readEntry(source.kind, source.path);
  if (!entry) throw new Error("The commitment wasn't saved because this record is no longer there. Reload the page.");
  if (!entry.ok) throw new Error("The commitment wasn't saved because this record needs repair. Fix the flagged file and try again.");
  return addCommitment(weekId, { text, due: due || null, link: source.path });
}
