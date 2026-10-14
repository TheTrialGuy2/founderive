import { describe, expect, it } from "vitest";
import { checkUpgrade } from "./auth";
import { parseClientMessage } from "./protocol";

const rules = { token: "a".repeat(64), appPort: 3000, terminalPort: 4100 };
const req = (over: { url?: string; origin?: string; host?: string } = {}) => ({
  url: over.url ?? `/?token=${rules.token}`,
  headers: { origin: over.origin ?? "http://127.0.0.1:3000", host: over.host ?? "127.0.0.1:4100" },
});

describe("checkUpgrade", () => {
  it("accepts the app's own page with the right token", () => {
    expect(checkUpgrade(req(), rules)).toEqual({ ok: true });
    expect(checkUpgrade(req({ origin: "http://localhost:3000", host: "localhost:4100" }), rules)).toEqual({ ok: true });
  });
  it("refuses a missing or wrong token", () => {
    expect(checkUpgrade(req({ url: "/" }), rules).ok).toBe(false);
    expect(checkUpgrade(req({ url: `/?token=${"b".repeat(64)}` }), rules).ok).toBe(false);
    expect(checkUpgrade(req({ url: "/?token=short" }), rules).ok).toBe(false);
  });
  it("refuses any other origin, including another local port", () => {
    for (const origin of ["https://evil.example", "http://127.0.0.1:3001", "http://127.0.0.1", "null", ""]) expect(checkUpgrade(req({ origin }), rules).ok).toBe(false);
    expect(checkUpgrade({ url: req().url, headers: { host: "127.0.0.1:4100" } }, rules).ok).toBe(false);
  });
  it("refuses another Host (DNS rebinding)", () => {
    for (const host of ["evil.example:4100", "127.0.0.1:4101", "127.0.0.1", ""]) expect(checkUpgrade(req({ host }), rules).ok).toBe(false);
  });
});

describe("parseClientMessage", () => {
  it("reads the four messages", () => {
    expect(parseClientMessage('{"type":"start","tool":"claude","cols":80,"rows":24}')).toEqual({ type: "start", tool: "claude", cols: 80, rows: 24 });
    expect(parseClientMessage('{"type":"input","data":"hi"}')).toEqual({ type: "input", data: "hi" });
    expect(parseClientMessage('{"type":"resize","cols":100,"rows":30}')).toEqual({ type: "resize", cols: 100, rows: 30 });
    expect(parseClientMessage('{"type":"end"}')).toEqual({ type: "end" });
  });
  it("refuses anything else, including other programs", () => {
    for (const raw of ["", "nope", '{"type":"start","tool":"bash","cols":80,"rows":24}', '{"type":"start","tool":"claude","cols":0,"rows":24}', '{"type":"resize","cols":"80","rows":24}', '{"type":"input","data":5}', '{"type":"run","cmd":"rm"}'])
      expect(parseClientMessage(raw)).toBeNull();
  });
});
