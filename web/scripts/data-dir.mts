// The founder's data folder, resolved by the same function the app uses. Agents run `pnpm -s data-dir` instead of guessing.
import { dataDir } from "../src/store/paths";

console.log(dataDir());
