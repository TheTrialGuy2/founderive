import { describe, expect, it } from "vitest";
import { commitmentFields } from "./commitment-fields";

describe("commitmentFields (the hidden fields Today's Done and Drop actions send)", () => {
  it("sends a carried commitment's own week, so the status lands in the check-in it lives in", () =>
    expect(commitmentFields({ id: "c-1", week: "2026-W41" }, "2026-W42", "done")).toEqual({ week: "2026-W41", id: "c-1", status: "done" }));
  it("uses this week for a commitment made this week", () => expect(commitmentFields({ id: "c-2" }, "2026-W42", "dropped")).toEqual({ week: "2026-W42", id: "c-2", status: "dropped" }));
});
