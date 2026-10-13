import { weekFile } from "../core/program";
import { readEntry } from "../store/read";
import { saveEntry } from "../store/write";

export async function setHomeworkStatus(week: number, id: string, status: string, reason?: string): Promise<void> {
  if (status !== "open" && status !== "done" && status !== "skipped") throw new Error(`Unknown status: ${status}`);
  const rel = weekFile(week);
  const entry = await readEntry("week", rel);
  if (!entry) throw new Error(`founder-data/${rel} doesn't exist.`);
  if (!entry.ok) throw new Error(`Fix founder-data/${rel} first: ${entry.error}`);
  const item = entry.data.homework.find((h) => h.id === id);
  if (!item) throw new Error("That homework item no longer exists. Reload the page.");
  const why = (reason ?? "").trim();
  if (status === "skipped" && !why) throw new Error('Say why you\'re skipping it. "Not relevant at this stage" is a fine reason.');
  item.status = status;
  item.skipReason = status === "skipped" ? why : null;
  await saveEntry("week", rel, entry.data, entry.body);
}
