import { initData } from "../src/store/init";

const result = await initData();
if (result.status === "exists") {
  console.log(`founder-data is already set up at ${result.dir}. Nothing changed.`);
  process.exit(0);
}
if (result.git === "unavailable") console.log("Git isn't available, so founder-data has no history yet.");
if (result.git === "commit-failed") {
  console.log(
    `Created founder-data, but the first commit failed: ${result.gitError}. Set git user.name/user.email, then run: git -C ${result.dir} add -A && git -C ${result.dir} commit -m 'Start founder-data'`,
  );
}
console.log(`Created ${result.dir}\nNext: pnpm dev, then open http://localhost:3000`);
