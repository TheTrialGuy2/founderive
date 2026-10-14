import { connection } from "next/server";
import { Suspense } from "react";
import { ClaudePanel } from "./ClaudePanel";

/** Reads the terminal's port and per-launch token at request time and hands them to the panel. Without start.mjs there's no terminal. */
export function ClaudePanelHost() {
  return (
    <Suspense fallback={null}>
      <Host />
    </Suspense>
  );
}

async function Host() {
  await connection();
  // Not available on Windows yet: the panel says so without trying to connect.
  if (process.platform === "win32") return <ClaudePanel terminal={null} platform="windows" />;
  const port = Number(process.env.FOUNDERIVE_TERMINAL_PORT);
  const token = process.env.FOUNDERIVE_TERMINAL_TOKEN ?? "";
  return <ClaudePanel terminal={port && /^[0-9a-f]{64}$/.test(token) ? { port, token } : null} />;
}
