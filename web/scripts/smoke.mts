// Fetches key routes from a running server and fails on non-200s or error pages.
const base = process.env.BASE_URL ?? "http://localhost:3000";
const routes = [
  "/",
  "/today",
  "/path/you",
  "/path/customer",
  "/path/problem",
  "/people",
  "/people?show=all",
  "/logged",
  "/logged?type=test",
  "/setup",
  "/canvas",
  "/canvas/customer",
  "/conversations",
  "/conversations/new",
  "/conversations/2026-10-08-dana-ortiz",
  "/tests",
  "/tests/new",
  "/tests/2026-10-06-paid-pilot",
  "/decisions",
  "/import",
  "/import/folder",
  "/feedback",
  "/demo/founder/today",
  "/demo/operator/overview",
];

// Next 16 streams RSC payloads as inline `self.__next_f.push(...)` scripts (and HTML comments as hydration
// markers). Those can carry a second, escaped copy of any text on the page, so text checks strip them first and
// match only what the browser would actually render. Status checks don't need this: they read `res.ok` directly.
function renderedText(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[^>]*>\s*self\.__next_f\.push\([\s\S]*?\)\s*<\/script>/g, "");
}

let failed = 0;
for (const route of routes) {
  const res = await fetch(base + route);
  const html = await res.text();
  const ok = res.ok && !renderedText(html).includes("Application error");
  console.log(`${ok ? "✓" : "✗"} ${res.status} ${route}`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
