import { describe, expect, it } from "vitest";
import { routeTerminalKey } from "./terminalKeys";

describe("routeTerminalKey", () => {
  it("sends every key to a running program, Tab and Escape included", () => {
    for (const key of ["a", "Enter", "Tab", "Escape", "ArrowUp"]) expect(routeTerminalKey(key, true)).toBe("program");
  });

  it("moves focus to the Close button on F6 while a program runs", () => {
    expect(routeTerminalKey("F6", true)).toBe("close-button");
  });

  it("lets Tab and Escape leave the terminal when nothing runs", () => {
    expect(routeTerminalKey("Tab", false)).toBe("page");
    expect(routeTerminalKey("Escape", false)).toBe("page");
  });

  it("leaves other keys to the terminal when nothing runs", () => {
    expect(routeTerminalKey("a", false)).toBe("program");
    expect(routeTerminalKey("F6", false)).toBe("program");
  });
});
