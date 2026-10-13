import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, formatDate, PageHeader } from "@/components/ui";
import { BlockForm } from "@/components/canvas/BlockForm";
import { ActionButton } from "@/components/today/ActionButton";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { confirmImportedAction } from "@/app/(workbook)/canvas/actions";
import { loadCanvasBlock } from "@/commands/canvas";

export default function CanvasBlockPage({ params }: PageProps<"/canvas/[id]">) {
  return (
    <Suspense fallback={<PageHeader eyebrow="Canvas" title="Loading…" />}>
      {params.then(({ id }) => (
        <BlockContent id={id} />
      ))}
    </Suspense>
  );
}

async function BlockContent({ id }: { id: string }) {
  await connection();
  const view = await loadCanvasBlock(id);
  if (view.status === "missing") {
    return (
      <>
        <PageHeader eyebrow="Canvas" title="Block not found" />
        <p className="text-sm text-muted">
          There&apos;s no &quot;{id}&quot; block in your canvas.{" "}
          <Link href="/canvas" className="font-medium text-teal-dark hover:text-navy">
            See all blocks
          </Link>
        </p>
      </>
    );
  }
  const { def, block, notes, flagged } = view;
  const history = [...(block?.history ?? [])].reverse();
  return (
    <>
      <PageHeader eyebrow="Canvas" title={def.title}>
        {def.prompt}
      </PageHeader>
      {flagged ? (
        <FlaggedFile path={flagged.path} error={flagged.error} />
      ) : (
        <>
          {block?.seeded && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-sand/60 p-3 text-sm">
              <Badge tone="warn">Imported — confirm</Badge>
              <span className="text-ink">This text was imported. Confirm it as yours, or edit it and save.</span>
              <ActionButton action={confirmImportedAction} fields={{ id }} label="Confirm imported text" variant="quiet" />
            </div>
          )}
          <BlockForm id={id} initial={{ text: block?.text ?? "", status: block?.status ?? "untested", notes }} />
        </>
      )}
      <section aria-labelledby="history-heading" className="mt-10">
        <h2 id="history-heading" className="font-semibold text-navy">
          Earlier wording
        </h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No earlier wording yet.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {history.map((h, i) => (
              <li key={`${h.date}-${i}`} className="rounded-lg border border-line bg-paper p-3 text-sm">
                <p className="text-xs font-medium text-muted">Until {formatDate(h.date)}</p>
                <p className="mt-1 whitespace-pre-wrap text-ink">{h.text}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
