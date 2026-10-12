import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import { ORG_NAME } from "@/config";
import { FounderTabBar, PersonaSwitch, QuickLog, SideNav } from "./Nav";

// The shell itself is static; only the URL-aware nav pieces render inside Suspense.
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 bg-navy px-4 py-2.5 text-sm text-white md:px-6">
        <div className="flex items-center gap-3">
          <Image src="/founderive-mark.svg" alt="" width={28} height={28} />
          <span className="font-serif text-base">{ORG_NAME}</span>
          <span className="hidden rounded bg-white/10 px-2 py-0.5 text-xs text-white/70 sm:inline">Demo</span>
        </div>
        <Suspense fallback={null}>
          <PersonaSwitch />
        </Suspense>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <Suspense fallback={<div className="md:w-56" />}>
          <SideNav />
          <FounderTabBar />
          <QuickLog />
        </Suspense>
        <main className="flex-1 px-4 pt-6 pb-28 md:px-10 md:py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
