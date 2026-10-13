import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { CopyPrompt } from "@/components/workbook/CopyPrompt";
import { loadPromptContext } from "@/commands/today";

export default function ImportFolderPage() {
  return (
    <>
      <PageHeader eyebrow="Bring what you have" title="Import a folder">
        Founderive doesn&apos;t read your documents itself. Claude Code or Codex does, opened in the Founderive folder on this computer. It drafts records marked &quot;Imported — confirm&quot; and never changes your originals.
      </PageHeader>
      <Suspense fallback={null}>
        <FolderPrompt />
      </Suspense>
    </>
  );
}

async function FolderPrompt() {
  await connection();
  const { dataDir } = await loadPromptContext();
  // dataDir comes from dataDir(), the same function `pnpm -s data-dir` prints.
  const prompt = `Import my documents into Founderive. Follow .claude/skills/import-folder/SKILL.md in this repo. My Founderive data folder is ${dataDir} (pnpm -s data-dir in web/ prints the same path). The folder to read is: <the folder with your documents>`;
  return <CopyPrompt title="Paste this into Claude Code or Codex, opened in the Founderive folder" prompts={{ fileChat: prompt }} />;
}
