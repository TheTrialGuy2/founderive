import { Suspense, type ReactNode } from "react";
import { ClaudePanelHost } from "@/components/claude/ClaudePanelHost";
import { LiveRefresh } from "./LiveRefresh";
import { WorkbookNav } from "./WorkbookNav";

export function WorkbookShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <Suspense fallback={<div className="md:w-60" />}>
        <WorkbookNav />
      </Suspense>
      {/* On wide screens the open Claude panel takes room from the page instead of covering it (ClaudePanel sets the variable). */}
      <main className="flex-1 px-4 pt-7 pb-16 md:px-10 md:pt-10 min-[900px]:mr-[var(--claude-panel-space,0px)]">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
      <LiveRefresh />
      <ClaudePanelHost />
    </div>
  );
}
