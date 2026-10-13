import { parse, stringify } from "yaml";

const FENCED = /^---\r?\n(?:([\s\S]*?)\r?\n)?---\r?\n?([\s\S]*)$/;

/** Splits a Markdown file into YAML frontmatter data and body. Throws if the YAML is malformed. */
export function parseFrontmatter(text: string): { data: unknown; body: string } {
  const match = FENCED.exec(text);
  if (!match) return { data: {}, body: text };
  return { data: parse(match[1] ?? "") ?? {}, body: match[2] };
}

export function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
  return `---\n${stringify(data).trimEnd()}\n---\n${body}`;
}
