// Today for agents and terminals: the same view the app renders, from the same function. --json prints the whole object.
import { loadToday } from "../src/commands/today";
import { formatToday } from "../src/commands/today-text";

const view = await loadToday();
console.log(process.argv.includes("--json") ? JSON.stringify(view, null, 2) : formatToday(view));
