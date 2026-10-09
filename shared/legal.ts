import { fillPlaceholders, legal, mailtoHref, site } from './config.ts';
import { policiesMarkdown, waiverMarkdown } from './legal.generated.ts';

/**
 * Tiny renderer for the limited markdown used in content/*.md:
 * "# " / "## " headings, paragraphs, "- " list items, **bold** and _italic_.
 */
export type Block =
  | { type: 'h1' | 'h2'; text: string }
  | { type: 'p'; html: string; plain: string };

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(md: string): string {
  return escape(md)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,;:]|$)/g, '$1<em>$2</em>');
}

const plain = (md: string) => md.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)_(.+?)_/g, '$1$2');

export function parse(md: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of md.split(/\n{2,}/)) {
    for (const raw of chunk.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) });
      else if (line.startsWith('# ')) blocks.push({ type: 'h1', text: line.slice(2) });
      else {
        let text = line.startsWith('- ') ? line.slice(2) : line;
        // A paragraph wrapped entirely in _..._ is a lede; render it upright, as the prototype does.
        if (/^_[^_]+_$/.test(text)) text = text.slice(1, -1);
        blocks.push({ type: 'p', html: inline(text), plain: plain(text) });
      }
    }
  }
  return blocks;
}

/** The waiver exactly as shown to signers, placeholders filled. This is what gets hashed. */
export const waiverText = () => fillPlaceholders(waiverMarkdown);
export const waiverBlocks = () => parse(waiverText());
export const waiverVersion = legal.waiverVersion;

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface PolicySection {
  title: string;
  items: Block[];
}

/** Policies grouped by "## " section. Paragraphs outside a section (e.g. "To cancel or reschedule...") go in `footer`. */
export function policySections(): { sections: PolicySection[]; footer: Block[] } {
  const sections: PolicySection[] = [];
  const footer: Block[] = [];
  let current: PolicySection | null = null;
  let afterLists = false;
  const lines = fillPlaceholders(policiesMarkdown).split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('# ')) continue;
    if (line.startsWith('## ')) {
      current = { title: line.slice(3), items: [] };
      sections.push(current);
      afterLists = false;
      continue;
    }
    const isItem = line.startsWith('- ');
    if (!isItem && current && current.items.length) afterLists = true;
    const block = parse(line)[0];
    if (current && !afterLists) current.items.push(block);
    else footer.push(block);
  }
  return { sections, footer };
}

/** Plain-text policy summary for emails. */
export function policiesPlain(): string {
  const { sections, footer } = policySections();
  return [
    ...sections.map((s) => `${s.title}\n${s.items.map((b) => (b.type === 'p' ? `- ${b.plain}` : '')).join('\n')}`),
    ...footer.map((b) => (b.type === 'p' ? b.plain : '')),
  ].join('\n\n');
}

/** Turn the email address inside rendered policy HTML into a mailto: link. */
export function linkContacts(html: string): string {
  return html.replace(site.email, `<a href="${mailtoHref()}">${site.email}</a>`);
}
