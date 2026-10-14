import Link from "next/link";

/** List (Home's path) or Canvas (the grid). Links, because each is its own page. */
export function ViewSwitch({ current }: { current: "list" | "canvas" }) {
  const item = (href: string, label: string, on: boolean) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={`rounded-md px-3 py-1 text-sm ${on ? "bg-navy font-semibold text-white" : "text-teal-dark hover:bg-aqua/45"}`}>
      {label}
    </Link>
  );
  return (
    <nav aria-label="Path view" className="inline-flex gap-1 rounded-lg border border-line bg-paper p-1">
      {item("/today", "List", current === "list")}
      {item("/canvas", "Canvas", current === "canvas")}
    </nav>
  );
}
