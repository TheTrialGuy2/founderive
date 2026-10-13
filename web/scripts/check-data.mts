import { checkData } from "../src/store/check";
import { dataDir } from "../src/store/paths";

const report = await checkData();
console.log(`Checked ${report.checked} files in ${dataDir()}`);
for (const e of report.errors) console.log(`✗ ${e.path}\n  ${e.error}`);
for (const rel of report.unknown) console.log(`? ${rel} (not a known file kind; ignored)`);
if (report.errors.length > 0) process.exit(1);
console.log("✓ All known files are valid");
