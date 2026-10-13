import path from "node:path";

export class OutsideDataDirError extends Error {}

/** Where the founder's files live. Defaults to ../founder-data relative to web/. Read on every call so tests can switch it. */
export function dataDir(): string {
  return path.resolve(process.env.FOUNDER_DATA_DIR ?? path.join(process.cwd(), "..", "founder-data"));
}

/** Resolves a founder-data-relative path, refusing anything that escapes the folder. */
export function resolveInData(rel: string): string {
  const root = dataDir();
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new OutsideDataDirError(`Path escapes founder-data: ${rel}`);
  return abs;
}

/** Where the starter template lives. Defaults to ../starter-data relative to web/. */
export function starterDir(): string {
  return path.resolve(process.env.FOUNDER_STARTER_DIR ?? path.join(process.cwd(), "..", "starter-data"));
}
