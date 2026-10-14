import { timingSafeEqual } from "node:crypto";

export type UpgradeRules = { token: string; appPort: number; terminalPort: number };

const header = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function sameToken(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Whether a WebSocket upgrade comes from Founderive's own page: the per-launch token, the app's exact origin, and this
 * server's own host (so a DNS-rebinding page can't reach it). Anything else is refused.
 */
export function checkUpgrade(req: { url?: string; headers: Record<string, string | string[] | undefined> }, rules: UpgradeRules): { ok: true } | { ok: false; reason: string } {
  const token = new URL(req.url ?? "/", "http://127.0.0.1").searchParams.get("token") ?? "";
  if (!sameToken(token, rules.token)) return { ok: false, reason: "token" };
  const origins = [`http://127.0.0.1:${rules.appPort}`, `http://localhost:${rules.appPort}`];
  if (!origins.includes(header(req.headers.origin))) return { ok: false, reason: "origin" };
  const hosts = [`127.0.0.1:${rules.terminalPort}`, `localhost:${rules.terminalPort}`];
  if (!hosts.includes(header(req.headers.host))) return { ok: false, reason: "host" };
  return { ok: true };
}
