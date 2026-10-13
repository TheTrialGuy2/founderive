export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-teal/45 bg-paper p-8 text-center">
      <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-teal" aria-hidden />
      <p className="font-semibold text-navy">{title}</p>
      {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
    </div>
  );
}
