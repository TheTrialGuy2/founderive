import { NextResponse, type NextRequest } from "next/server";
import { isLocalHost } from "@/lib/local-host";

// Founderive runs on the founder's own computer and only answers requests addressed to it.
export function proxy(request: NextRequest) {
  if (!isLocalHost(request.headers.get("host"))) return new NextResponse("Founderive only answers on localhost.", { status: 403 });
  return NextResponse.next();
}
