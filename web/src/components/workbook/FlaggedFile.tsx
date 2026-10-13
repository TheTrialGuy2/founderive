/** A founder-data file that failed validation: shown, never dropped. */
export function FlaggedFile({ path, error }: { path: string; error: string }) {
  return (
    <div className="rounded-xl border border-coral/70 bg-coral-soft/60 p-3 text-sm">
      <p className="font-mono text-xs text-[#8a2d1c]">founder-data/{path}</p>
      <p className="mt-1 text-ink">{error}</p>
    </div>
  );
}
