import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { AskClaudeButton } from "@/components/claude/AskClaudeButton";
import { CopyPrompt } from "@/components/workbook/CopyPrompt";
import { loadPromptContext } from "@/commands/today";
import { importFolderPrompt } from "@/lib/prompts";

export default function ImportFolderPage() {
  return (
    <>
      <PageHeader eyebrow="Bring what you have" title="Import a folder">
        Founderive doesn&apos;t read your documents itself. Claude Code or Codex does. It drafts records marked &quot;Imported — confirm&quot; and never changes your originals.
      </PageHeader>
      <Suspense fallback={null}>
        <FolderPrompt />
      </Suspense>
    </>
  );
}

async function FolderPrompt() {
  await connection();
  const { dataDir, repo } = await loadPromptContext();
  const prompt = importFolderPrompt({ repo, dataDir });
  return (
    <div className="space-y-6">
      <section className="space-y-2 text-sm text-ink">
        <h2 className="font-semibold text-navy">Where your documents can be</h2>
        <p>
          Simplest: put them, or copies, in <span className="font-mono text-xs">_reference/</span> inside your Founderive folder (<span className="font-mono text-xs">{dataDir}</span>). That&apos;s your private reference folder. Claude can read it without asking, and Founderive never writes there.
        </p>
        <p>Or name any folder on this computer. Claude asks once for permission to read it, because it&apos;s outside your Founderive folder. Either way your originals are never changed.</p>
      </section>
      <section className="space-y-2">
        <AskClaudeButton line={prompt} label="Ask Claude to import a folder" />
        <p className="text-xs text-muted">It types the ask into the Claude panel. Replace the folder at the end, then press Enter.</p>
      </section>
      <CopyPrompt title="Or paste this into Claude Code or Codex in your own terminal" prompts={{ fileChat: prompt }} />
    </div>
  );
}
