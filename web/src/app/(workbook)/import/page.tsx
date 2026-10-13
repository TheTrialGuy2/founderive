import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { ImportFlow } from "@/components/import/ImportFlow";
import { CopyPrompt } from "@/components/workbook/CopyPrompt";
import { loadCanvasDefs } from "@/commands/canvas";
import { loadPromptContext } from "@/commands/today";
import { importPrompt } from "@/lib/prompts";

export default function ImportPage() {
  return (
    <>
      <PageHeader eyebrow="Bring what you have" title="Paste from a chat">
        Your chat summarizes what you&apos;ve told it in a format Founderive reads. You see everything before it&apos;s created.
      </PageHeader>
      <Suspense fallback={null}>
        <ImportContent />
      </Suspense>
    </>
  );
}

async function ImportContent() {
  await connection();
  const [{ defs }, vars] = await Promise.all([loadCanvasDefs(), loadPromptContext()]);
  return (
    <div className="space-y-6">
      <CopyPrompt title="1. Copy this into the chat where you worked on your business" prompts={{ pasteBridge: importPrompt(vars) }} />
      <ImportFlow blocks={defs.map((d) => ({ id: d.id, title: d.title }))} />
    </div>
  );
}
