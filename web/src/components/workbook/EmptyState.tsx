export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-paper p-8 text-center">
      <p className="font-medium text-navy">{title}</p>
      {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
    </div>
  );
}
