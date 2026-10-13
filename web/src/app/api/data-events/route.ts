import { watch, type FSWatcher } from "node:fs";
import { connection } from "next/server";
import { dataDir } from "@/store/paths";

// Streams one "change" event per burst of edits in founder-data (debounced), so open pages can refresh.
export async function GET(request: Request) {
  await connection();
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let watcher: FSWatcher | undefined;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));
      try {
        watcher = watch(dataDir(), { recursive: true }, (_event, name) => {
          if (name && (name.endsWith(".tmp") || name.split(/[\\/]/).includes(".git"))) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            try {
              controller.enqueue(encoder.encode("data: change\n\n"));
            } catch {
              // stream already closed
            }
          }, 150);
        });
      } catch {
        controller.enqueue(encoder.encode(": founder-data not found\n\n"));
      }
      request.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        watcher?.close();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
