/** A block of the small Markdown subset used by `docs/privacy.md`. */
export type MarkdownBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; spans: MarkdownSpan[] }
  | { kind: 'paragraph'; spans: MarkdownSpan[] }
  | { kind: 'list'; items: MarkdownSpan[][] };

export type MarkdownSpan = { kind: 'text'; text: string } | { kind: 'link'; text: string; url: string };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)|<((?:https?:\/\/|mailto:)[^>\s]+)>/g;

/**
 * Parses headings, paragraphs, `-` lists and links; other Markdown stays plain text. The result is
 * rendered by Angular templates, never as HTML, so the text cannot inject markup.
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const paragraphs = source
    .replace(/\r\n/g, '\n')
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .split(/\n\s*\n/);
  for (const paragraph of paragraphs) {
    const lines = paragraph.split('\n').filter((line) => line.trim());
    if (!lines.length) {
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
    if (heading && lines.length === 1) {
      blocks.push({ kind: 'heading', level: heading[1].length as 1 | 2 | 3, spans: parseSpans(heading[2]) });
    } else if (lines.every((line) => /^\s*-\s+/.test(line) || /^\s{2,}\S/.test(line))) {
      const items: string[] = [];
      for (const line of lines) {
        if (/^\s*-\s+/.test(line)) {
          items.push(line.replace(/^\s*-\s+/, ''));
        } else {
          items[items.length - 1] += ` ${line.trim()}`;
        }
      }
      blocks.push({ kind: 'list', items: items.map(parseSpans) });
    } else {
      blocks.push({ kind: 'paragraph', spans: parseSpans(lines.map((line) => line.trim()).join(' ')) });
    }
  }
  return blocks;
}

function parseSpans(text: string): MarkdownSpan[] {
  const spans: MarkdownSpan[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    if (match.index > last) {
      spans.push({ kind: 'text', text: plain(text.slice(last, match.index)) });
    }
    const url = match[2] ?? match[3];
    spans.push({ kind: 'link', text: plain(match[1] ?? url.replace(/^mailto:/, '')), url });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    spans.push({ kind: 'text', text: plain(text.slice(last)) });
  }
  return spans;
}

/** Drops emphasis and code markers. */
function plain(text: string): string {
  return text.replace(/\*\*|__|`/g, '');
}
