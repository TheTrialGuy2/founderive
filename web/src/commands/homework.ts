import { weekFile } from "../core/program";
import { updateEntry } from "../store/update";

export async function setHomeworkStatus(week: number, id: string, status: string, reason?: string): Promise<void> {
  if (status !== "open" && status !== "done" && status !== "skipped") throw new Error(`Unknown status: ${status}`);
  const rel = weekFile(week);
  const why = (reason ?? "").trim();
  await updateEntry("week", rel, (data, body) => {
    if (!data) throw new Error(`founder-data/${rel} doesn't exist.`);
    const item = data.homework.find((h) => h.id === id);
    if (!item) throw new Error("That homework item no longer exists. Reload the page.");
    if (status === "skipped" && !why) throw new Error('Say why you\'re skipping it. "Not relevant at this stage" is a fine reason.');
    item.status = status;
    item.skipReason = status === "skipped" ? why : null;
    return { data, body };
  });
}
