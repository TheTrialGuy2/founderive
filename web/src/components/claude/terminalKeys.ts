/**
 * What a key pressed inside the terminal does.
 * - "program": the terminal sends it to the running program (every key, Escape included).
 * - "page": the terminal ignores it, so the browser and the panel handle it (Tab moves focus, Escape closes).
 * - "close-button": focus moves out to the panel's Close button (F6, while a program runs).
 */
export type TerminalKeyRoute = "program" | "page" | "close-button";

export function routeTerminalKey(key: string, running: boolean): TerminalKeyRoute {
  if (running) return key === "F6" ? "close-button" : "program";
  return key === "Tab" || key === "Escape" ? "page" : "program";
}
