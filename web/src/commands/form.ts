import { isoDate } from "../store/schemas";

/** A parsed record form: typed input, or field errors plus exactly what was typed (so the form keeps it). */
export type Parsed<T> = { ok: true; input: T; values: Record<string, string> } | { ok: false; errors: Record<string, string>; values: Record<string, string> };

export function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function all(fd: FormData, key: string): string[] {
  return fd.getAll(key).map((v) => (typeof v === "string" ? v.trim() : ""));
}

/** Non-empty trimmed lines: quotes, numbers and alternatives are entered one per line. */
export function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export const isRealDate = (v: string): boolean => isoDate.safeParse(v).success;

export function oneOf<T extends string>(list: readonly T[], v: string): v is T {
  return (list as readonly string[]).includes(v);
}

export function required(value: string | null | undefined, message: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(message);
  return v;
}

export const orNull = (v: string): string | null => v || null;
