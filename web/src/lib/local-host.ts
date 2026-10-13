const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** True when the request's Host header names this computer. Rejecting other names blocks DNS-rebinding requests from web pages. */
export function isLocalHost(hostHeader: string | null): boolean {
  if (!hostHeader) return false;
  return LOCAL_HOSTS.has(hostHeader.replace(/:\d+$/, "").toLowerCase());
}
