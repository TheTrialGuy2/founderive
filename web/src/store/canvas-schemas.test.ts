import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { canvasBlockSchema, canvasConfigSchema, kindOf } from "./schemas";

const paths = (schema: z.ZodType, v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("canvas kinds", () => {
  it("maps the config and block files", () => {
    expect(kindOf("canvas/blocks.md")).toBe("canvasConfig");
    expect(kindOf("canvas/customer.md")).toBe("canvasBlock");
    expect(kindOf("canvas/unfair-advantage.md")).toBe("canvasBlock");
    expect(kindOf("canvas/Customer.md")).toBeNull();
    expect(kindOf("canvas/sub/customer.md")).toBeNull();
  });
  it("a config lists unique blocks, each with an id, title and prompt", () => {
    const block = { id: "customer", title: "Customer", prompt: "Who has the problem?" };
    expect(paths(canvasConfigSchema, { blocks: [block] })).toEqual([]);
    expect(paths(canvasConfigSchema, { blocks: [] })).toEqual(["blocks"]);
    expect(paths(canvasConfigSchema, { blocks: [block, block] })).toEqual(["blocks"]);
    expect(paths(canvasConfigSchema, { blocks: [{ ...block, id: "blocks" }] })).toEqual(["blocks.0.id"]);
    expect(paths(canvasConfigSchema, { blocks: [{ ...block, id: "Our Customer" }] })).toEqual(["blocks.0.id"]);
  });
  it("a block defaults to untested with no history, and keeps declared metadata", () => {
    expect(canvasBlockSchema.parse({ id: "customer", text: "Agency owners", seeded: true })).toMatchObject({
      status: "untested",
      history: [],
      seeded: true,
    });
    expect(paths(canvasBlockSchema, { id: "customer", status: "proven" })).toEqual(["status"]);
    expect(paths(canvasBlockSchema, { id: "customer", history: [{ date: "2026-13-01", text: "x" }] })).toEqual(["history.0.date"]);
  });
});
