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

/** Splits a record body into its `## ` sections, in order. Text before the first heading comes first with heading null. Empty sections are dropped. */
export function bodySections(body: string): { heading: string | null; text: string }[] {
  const lines = body.split(/\r?\n/);
  const headingAt = (line: string) => {
    const m = /^## (.+)$/.exec(line);
    return m ? m[1] : null;
  };
  const starts: { index: number; heading: string | null }[] = [{ index: 0, heading: null }];
  lines.forEach((line, i) => {
    const h = headingAt(line);
    if (h !== null) starts.push({ index: i, heading: h });
  });
  const sections = starts.map((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : lines.length;
    const from = s.heading === null ? s.index : s.index + 1;
    return { heading: s.heading, text: lines.slice(from, end).join("\n").trim() };
  });
  return sections.filter((s) => s.text.length > 0);
}
