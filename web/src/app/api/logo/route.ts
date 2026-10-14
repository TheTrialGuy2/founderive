import { connection } from "next/server";
import { readEntry } from "@/store/read";
import { readLogo } from "@/store/logo";

/**
 * Serves the founder's uploaded logo straight from founder-data (never from the filesystem directly; readLogo is
 * the store). Only serves when founder.md actually points at a logo — a stray brand/logo.* file left behind by
 * some other means (or founder.logo pointing at a file that's gone missing) is never served.
 */
export async function GET() {
  await connection();
  const founder = await readEntry("founder", "founder.md");
  if (!founder?.ok || !founder.data.logo) return new Response(null, { status: 404 });
  const logo = await readLogo();
  if (!logo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(logo.bytes), {
    headers: {
      "Content-Type": logo.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
