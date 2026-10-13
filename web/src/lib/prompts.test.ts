import { describe, expect, it } from "vitest";
import { fileChatPrompt, FILE_CHAT_ENDINGS, fillPrompt, importPrompt, weekPrompt, weekPromptVars } from "./prompts";

const vars = { dataDir: "/Users/sam/Lantern", venture: "Lantern", today: "2026-10-13" };
const leftover = /\{(dataDir|venture|today|outcome|commitments)\}/;

describe("fillPrompt", () => {
  it("fills every known placeholder and leaves other braces alone", () =>
    expect(fillPrompt("Read {dataDir} for {venture}. {dataDir} again. Keep { id, text }.", vars)).toBe("Read /Users/sam/Lantern for Lantern. /Users/sam/Lantern again. Keep { id, text }."));
});

describe("file-editing prompts", () => {
  it("share the base prompt and end with the variant's paragraph", () => {
    for (const ending of Object.keys(FILE_CHAT_ENDINGS) as (keyof typeof FILE_CHAT_ENDINGS)[]) {
      const p = fileChatPrompt(ending, vars);
      expect(p.startsWith("I'm building Lantern and I keep my founder record in Founderive, a folder of Markdown files at `/Users/sam/Lantern`.")).toBe(true);
      expect(p).not.toMatch(leftover);
    }
    expect(fileChatPrompt("no-outcome", vars).endsWith("Create the check-in file if it doesn't exist, with `week` set.")).toBe(true);
  });
});

describe("browser-chat prompts", () => {
  it("the import prompt carries today's date and the import fence", () => {
    const p = importPrompt(vars);
    expect(p).toContain("Today is 2026-10-13.");
    expect(p).toContain("```founderive-import");
    expect(p).not.toMatch(leftover);
  });
  it("the weekly prompt lists the outcome and open commitments with ids", () => {
    const week = weekPromptVars({
      outcome: "Talk to five agency owners",
      commitments: [
        { id: "c-1", text: "Email the two agencies", due: "2026-10-12", status: "open" },
        { id: "c-2", text: "Draft questions", status: "done" },
        { id: "c-3", text: "Call Lee", status: "open" },
      ],
    });
    const p = weekPrompt({ ...vars, ...week });
    expect(p).toContain("This week's outcome: Talk to five agency owners\nOpen commitments:\nc-1: Email the two agencies (2026-10-12)\nc-3: Call Lee (no due date)\n");
    expect(p).toContain("```founderive-week");
    expect(p).not.toMatch(leftover);
  });
  it("the weekly prompt always asks for blocker and help, with none when there's nothing", () => {
    const p = weekPrompt({ ...vars, outcome: "x", commitments: "none open" });
    expect(p).toContain("blocker: <one line, or none>\nhelp: <one line, or none>\n```");
    expect(p).toContain("- Always include `blocker` and `help`. Write `none` if there's nothing. Leave out `new` if there's nothing new.\n");
    expect(p).not.toContain("Leave out `blocker`, `help` or `new`");
  });
  it("uses the app fills when there's no outcome or nothing open", () => {
    expect(weekPromptVars(null)).toEqual({ outcome: "none yet", commitments: "none open" });
  });
});
