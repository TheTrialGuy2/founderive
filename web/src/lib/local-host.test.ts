import { describe, expect, it } from "vitest";
import { isLocalHost } from "./local-host";

describe("isLocalHost", () => {
  it.each(["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "localhost", "127.0.0.1", "LOCALHOST:3000", "LocalHost"])("accepts %s", (h) => expect(isLocalHost(h)).toBe(true));
  it.each(["evil.example:3000", "192.168.1.20:3000", "localhost.evil.example", "", null, "EVIL.EXAMPLE:3000"])("rejects %s", (h) => expect(isLocalHost(h)).toBe(false));
});
