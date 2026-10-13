import { factsFromFounder, factsFromRecords, mergeFacts, type GuideFacts } from "../core/guide";
import { listEntries } from "../store/read";
import type { KindData } from "../store/schemas";

export type LoopRecords = {
  conversations: { path: string; data: KindData<"conversation"> }[];
  tests: { path: string; data: KindData<"test"> }[];
};

/** Every readable conversation and test. Unreadable files are left out here; check-data and Today's "Files to fix" list them. */
export async function loadLoopRecords(): Promise<LoopRecords> {
  const [conversations, tests] = await Promise.all([listEntries("conversation"), listEntries("test")]);
  return {
    conversations: conversations.flatMap((e) => (e.ok ? [{ path: e.path, data: e.data }] : [])),
    tests: tests.flatMap((e) => (e.ok ? [{ path: e.path, data: e.data }] : [])),
  };
}

/** Guide facts: what setup proves, merged with what the records prove (a guide step completes from attached evidence). */
export async function loadGuideFacts(founder: KindData<"founder">, records?: LoopRecords): Promise<Partial<GuideFacts>> {
  const r = records ?? (await loadLoopRecords());
  return mergeFacts(factsFromFounder(founder), factsFromRecords({ conversations: r.conversations.map((c) => c.data), tests: r.tests.map((t) => t.data) }));
}
