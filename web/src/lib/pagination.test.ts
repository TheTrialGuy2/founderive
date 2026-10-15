import { describe, expect, it } from "vitest";
import { pageHref, pageNumber, paginate } from "./pagination";

describe("pageNumber", () => {
  it.each([undefined, "", "0", "-1", "1.5", "hello", ["2"]])("uses page 1 for %j", (value) => {
    expect(pageNumber(value)).toBe(1);
  });

  it("accepts a positive integer", () => {
    expect(pageNumber("12")).toBe(12);
  });
});

describe("paginate", () => {
  const rows = Array.from({ length: 23 }, (_, index) => index + 1);

  it("returns the requested slice and range", () => {
    expect(paginate(rows, 2)).toEqual({ items: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], page: 2, pageCount: 3, total: 23, from: 11, to: 20 });
  });

  it("clamps a stale page to the final populated page", () => {
    expect(paginate(rows, 99)).toMatchObject({ items: [21, 22, 23], page: 3, from: 21, to: 23 });
  });

  it("describes an empty collection without a false range", () => {
    expect(paginate([], 3)).toEqual({ items: [], page: 1, pageCount: 1, total: 0, from: 0, to: 0 });
  });
});

describe("pageHref", () => {
  it("preserves filters and omits page 1", () => {
    expect(pageHref("/logged", { type: "test", q: "price" }, "page", 1)).toBe("/logged?type=test&q=price");
  });

  it("adds the named page parameter", () => {
    expect(pageHref("/conversations", { advicePage: "3" }, "evidencePage", 2)).toBe("/conversations?advicePage=3&evidencePage=2");
  });
});
