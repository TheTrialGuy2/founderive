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

const run = (args: string[]) => execFileSync("git", args, { cwd: target, stdio: ["ignore", "pipe", "pipe"] });

if (!(await exists(path.join(target, ".git")))) {
  let gitReady = true;
  try {
    run(["init", "-q"]);
  } catch {
    gitReady = false;
    console.log("Git isn't available, so founder-data has no history yet.");
  }
  if (gitReady) {
    try {
      run(["add", "-A"]);
      run(["commit", "-q", "-m", "Start founder-data from the Founderive starter"]);
    } catch (error) {
      const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
      const firstLine = stderr.split("\n")[0] ?? "";
      console.log(
        `Created founder-data, but the first commit failed: ${firstLine}. Set git user.name/user.email, then run: git -C ${target} add -A && git -C ${target} commit -m 'Start founder-data'`,
      );
    }
  }
}
console.log(`Created ${target}\nNext: pnpm dev, then open http://localhost:3000`);
