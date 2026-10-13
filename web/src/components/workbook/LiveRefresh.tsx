"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders server pages whenever founder-data changes, e.g. when Claude or Codex writes a file.
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const source = new EventSource("/api/data-events");
    source.onmessage = () => router.refresh();
    return () => source.close();
  }, [router]);
  return null;
}
