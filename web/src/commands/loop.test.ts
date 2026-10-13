import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { createConversation } from "./conversations";
import { loadGuideFacts, loadLoopRecords } from "./loop";
import { DANA, MENTOR, PILOT } from "./test-inputs";
import { abandonTest, completeTest, createTest } from "./venture-tests";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  await clearLoopRecords(env.dir);
});
afterEach(() => env.cleanup());

describe("loadGuideFacts", () => {
  it("merges setup answers with what the records prove", async () => {
    await createConversation(DANA);
    await createConversation({ ...DANA, type: "prospect", person: "Lee Park", org: null });
    await createConversation(MENTOR);
    const done = await createTest(PILOT, "2026-10-13");
    await completeTest(
      done,
      { result: "inconclusive", evidenceStrength: "none", learning: "Too few offers", decision: "revise", why: "Need more offers", nextCommitment: "Make three more offers", nextCommitmentDue: "" },
      "2026-10-13",
    );
    const dropped = await createTest({ ...PILOT, title: "Directory listing" }, "2026-10-13");
    await abandonTest(dropped, "Not relevant at this stage", "2026-10-13");
    const founder = await readEntry("founder", "founder.md");
    if (!founder?.ok) throw new Error("fixture founder unreadable");
    const records = await loadLoopRecords();
    expect(records.conversations).toHaveLength(3);
    expect(await loadGuideFacts(founder.data, records)).toEqual({ hasTargetCustomer: true, customerConversations: 2, tests: 1, completedTests: 1 });
  });
});
