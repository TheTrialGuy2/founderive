import { Suspense, type ReactNode } from "react";
import { LiveRefresh } from "./LiveRefresh";
import { WorkbookNav } from "./WorkbookNav";

export function WorkbookShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Suspense fallback={<div className="md:w-56" />}>
        <WorkbookNav />
      </Suspense>
      <main className="flex-1 px-4 pt-6 pb-16 md:px-10 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
      <LiveRefresh />
    </div>
  );
}
