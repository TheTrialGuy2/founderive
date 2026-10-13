// Fetches key routes from a running server and fails on non-200s or error pages.
const base = process.env.BASE_URL ?? "http://localhost:3000";
const routes = ["/", "/today", "/setup", "/canvas", "/canvas/customer", "/conversations", "/conversations/new", "/tests", "/tests/new", "/decisions", "/import", "/import/folder", "/demo/founder/today", "/demo/operator/overview"];
let failed = 0;
for (const route of routes) {
  const res = await fetch(base + route);
  const html = await res.text();
  const ok = res.ok && !html.includes("Application error");
  console.log(`${ok ? "✓" : "✗"} ${res.status} ${route}`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
