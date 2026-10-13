import { existsSync } from "node:fs";
import { checkData } from "../src/store/check";
import { dataDir } from "../src/store/paths";

const dir = dataDir();
if (!existsSync(dir)) {
  console.log(`founder-data not found at ${dir}. Run pnpm init-data first.`);
  process.exit(1);
}

const report = await checkData();
const checkedValid = report.checked - report.unknown.length - report.misnamed.length;
console.log(`Checked ${checkedValid} files in ${dir} (${report.unknown.length} unknown kinds ignored)`);
for (const e of report.errors) console.log(`✗ ${e.path}\n  ${e.error}`);
for (const w of report.warnings) console.log(`! ${w.path}\n  ${w.warning}`);
for (const rel of report.unknown) console.log(`? ${rel} (not a known file kind; ignored)`);
if (report.errors.length > 0) process.exit(1);
console.log(report.warnings.length ? `✓ All known files are valid (${report.warnings.length} warnings to fix when you can)` : "✓ All known files are valid");
