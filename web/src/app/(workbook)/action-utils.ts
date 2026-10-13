import { refresh } from "next/cache";
import type { ActionState } from "@/lib/action-state";

export function field(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Runs a mutation. On failure, returns the message and what was typed, so the form keeps it. */
export async function run(work: () => Promise<unknown>, values?: Record<string, string>): Promise<ActionState> {
  try {
    await work();
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't save. Try again.", values };
  }
  refresh();
  return { status: "saved" };
}
