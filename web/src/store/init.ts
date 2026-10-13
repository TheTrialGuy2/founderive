import { execFileSync } from "node:child_process";
import { access, cp } from "node:fs/promises";
import path from "node:path";
import { dataDir, starterDir } from "./paths";

export type InitResult = { status: "exists" | "created"; dir: string; git: "already" | "committed" | "unavailable" | "commit-failed"; gitError?: string };

const exists = (p: string) => access(p).then(() => true, () => false);

/** Creates founder-data from the starter if founder.md doesn't exist yet. Never overwrites; gives the folder its own git history. */
export async function initData(): Promise<InitResult> {
  const dir = dataDir();
  if (await exists(path.join(dir, "founder.md"))) return { status: "exists", dir, git: "already" };

  await cp(starterDir(), dir, { recursive: true, force: false, errorOnExist: false });

  if (await exists(path.join(dir, ".git"))) return { status: "created", dir, git: "already" };
  const run = (args: string[]) => execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
  try {
    run(["init", "-q"]);
  } catch {
    return { status: "created", dir, git: "unavailable" };
  }
  try {
    run(["add", "-A"]);
    run(["commit", "-q", "-m", "Start founder-data from the Founderive starter"]);
    return { status: "created", dir, git: "committed" };
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    return { status: "created", dir, git: "commit-failed", gitError: stderr.split("\n")[0] ?? "" };
  }
}
