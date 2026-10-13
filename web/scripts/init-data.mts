import { execFileSync } from "node:child_process";
import { access, cp } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../src/store/paths";

const exists = (p: string) => access(p).then(() => true, () => false);
const starter = path.resolve(process.cwd(), "..", "starter-data");
const target = dataDir();

if (await exists(path.join(target, "founder.md"))) {
  console.log(`founder-data is already set up at ${target}. Nothing changed.`);
  process.exit(0);
}

// Never overwrites: files already in the folder (e.g. private reference notes) are kept.
await cp(starter, target, { recursive: true, force: false, errorOnExist: false });

if (!(await exists(path.join(target, ".git")))) {
  try {
    execFileSync("git", ["init", "-q"], { cwd: target });
    execFileSync("git", ["add", "-A"], { cwd: target });
    execFileSync("git", ["commit", "-q", "-m", "Start founder-data from the Founderive starter"], { cwd: target });
  } catch {
    console.log("Git isn't available, so founder-data has no history yet.");
  }
}
console.log(`Created ${target}\nNext: pnpm dev, then open http://localhost:3000`);
