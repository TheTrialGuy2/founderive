import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, Card, formatDate, PageHeader } from "@/components/ui";
import { FlaggedFile } from "@/components/workbook/FlaggedFile";
import { loadCanvas, type CanvasCard } from "@/commands/canvas";
import { CANVAS_STATUS_LABELS } from "@/lib/loop-labels";

export default function CanvasPage() {
  return (
    <>
      <PageHeader title="Canvas">Your current beliefs about the business, one block each. A block is a belief until a test backs it.</PageHeader>
      <Suspense fallback={null}>
        <CanvasContent />
      </Suspense>
    </>
  );
}

async function CanvasContent() {
  await connection();
  const { cards, configError, others } = await loadCanvas();
  const firstRun = cards.every((c) => !c.block?.text.trim() && !c.flagged);
  return (
    <>
      {configError && (
        <div className="mb-6">
          <FlaggedFile path={configError.path} error={configError.error} />
          <p className="mt-1 text-sm text-muted">Showing the default blocks until that file is fixed.</p>
        </div>
      )}
      {firstRun && (
        <div className="mb-6 rounded-xl border border-dashed border-teal/45 bg-paper p-5">
          <p className="font-semibold text-navy">Start with the block you&apos;re surest about</p>
          <p className="mt-1 text-sm text-muted">Write a sentence or two in your own words. You can change it any time, and earlier wording is kept.</p>
        </div>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li key={card.def.id}>
            <BlockCard card={card} />
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <Card title={`Other canvas files · ${others.length}`} className="mt-6">
          <ul className="space-y-2">
            {others.map((o) => (
              <li key={o.path}>
                <FlaggedFile path={o.path} error={o.error} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function BlockCard({ card }: { card: CanvasCard }) {
  const { def, block, flagged } = card;
  const text = block?.text.trim() ?? "";
  const status = text && block ? block.status : null;
  const tone = flagged ? "bad" : status === "tested" ? "good" : status === "some-evidence" ? "info" : status === "untested" ? "warn" : "neutral";
  return (
    <Link href={`/canvas/${def.id}`} className="flex h-full flex-col rounded-xl border border-line bg-paper p-4 hover:border-teal-dark">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-navy">{def.title}</h2>
        <Badge tone={tone}>{flagged ? "Can't read" : status ? CANVAS_STATUS_LABELS[status] : "Empty"}</Badge>
      </div>
      {flagged ? (
        <p className="mt-2 text-sm text-[#8a2d1c]">founder-data/{flagged.path} has a problem. Open the block to see it.</p>
      ) : text ? (
        <p className="mt-2 line-clamp-4 text-sm text-ink">{text}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">Not written yet. {def.prompt}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        {block?.seeded && <Badge tone="warn">Imported — confirm</Badge>}
        {block?.updated && <span className="text-xs text-muted">Updated {formatDate(block.updated)}</span>}
      </div>
    </Link>
  );
}
