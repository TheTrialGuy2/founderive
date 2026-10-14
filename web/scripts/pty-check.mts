// Checks that the terminal library behind the Claude panel can start a program on this computer.
const help = "Try: cd web && pnpm install. If it keeps failing, use Claude Code in your own terminal; the rest of Founderive works without the panel.";

let pty: typeof import("node-pty");
try {
  pty = await import("node-pty");
} catch (error) {
  console.error("The terminal library isn't installed on this computer, so the Claude panel can't start here.");
  console.error(`(${(error as Error).message})`);
  console.error(help);
  process.exit(1);
}

try {
  const t = pty.spawn("/bin/sh", ["-c", "echo pty ok"], { name: "xterm-256color", cols: 80, rows: 24 });
  let out = "";
  t.onData((d) => (out += d));
  t.onExit(() => {
    console.log(out.trim() || "pty started but printed nothing");
    console.log("The panel starts claude and codex through your login shell, so it finds them on that shell's PATH.");
    process.exit(out.includes("pty ok") ? 0 : 1);
  });
} catch (error) {
  console.error(`The Claude panel's terminal can't start here: ${(error as Error).message}`);
  console.error(help);
  process.exit(1);
}
