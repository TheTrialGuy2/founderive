const isHeading = (line: string) => /^##\s/.test(line);

function bounds(lines: string[], heading: string): { start: number; end: number } | null {
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start < 0) return null;
  const next = lines.findIndex((l, i) => i > start && isHeading(l));
  return { start, end: next < 0 ? lines.length : next };
}

/** The text under `## heading`, up to the next `## ` heading. Empty when the section is absent. */
export function getSection(body: string, heading: string): string {
  const lines = body.split(/\r?\n/);
  const b = bounds(lines, heading);
  return b ? lines.slice(b.start + 1, b.end).join("\n").trim() : "";
}

/** Replaces the text under `## heading`, or appends the section when it's missing. Other sections are untouched. */
export function setSection(body: string, heading: string, content: string): string {
  const lines = body.split(/\r?\n/);
  const c = content.trim();
  const block = c ? [`## ${heading}`, "", c, ""] : [`## ${heading}`, ""];
  const b = bounds(lines, heading);
  if (!b) {
    const kept = body.trimEnd();
    return `${kept ? `${kept}\n\n` : ""}${block.join("\n")}`;
  }
  return [...lines.slice(0, b.start), ...block, ...lines.slice(b.end)].join("\n");
}
