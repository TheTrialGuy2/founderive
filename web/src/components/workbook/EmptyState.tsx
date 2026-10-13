export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-teal/45 bg-paper p-8 text-center shadow-[0_1px_2px_rgba(18,32,51,0.04)]">
      <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-teal" aria-hidden />
      <p className="font-semibold text-navy">{title}</p>
      {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
    </div>
  );
}
