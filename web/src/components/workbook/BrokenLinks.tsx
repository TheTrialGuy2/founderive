import { describeBrokenLink, type BrokenLink } from "@/core/links";

const DEFAULT_HINT = "Fix the path in the file, or unlink it below. Nothing else on this page is affected.";

/** Links in this record that point nowhere. The record still shows; the founder fixes the path or unlinks it. */
export function BrokenLinks({ links, hint = DEFAULT_HINT }: { links: BrokenLink[]; hint?: string }) {
  return (
    <div role="note" className="mb-6 rounded-xl border border-[#d9a520] bg-[#fff3d6] p-3 text-sm text-ink">
      <p className="font-semibold">Links to fix · {links.length}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {links.map((b) => (
          <li key={`${b.field}:${b.target}`} className="font-mono text-xs">
            {describeBrokenLink(b)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">{hint}</p>
    </div>
  );
}
