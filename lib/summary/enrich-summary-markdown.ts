import { stripMarkdownFromHeadings } from '@/lib/summary/markdown-display';

/**
 * Post-processes model (or legacy plain-text) summaries so numbers and key ideas
 * are always visually emphasized — even when the LLM skips markdown formatting.
 */

function isInsideMarkdownToken(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 3), index);
  return (
    before.endsWith('==') ||
    before.endsWith('**') ||
    before.endsWith('[') ||
    text[index - 1] === ']'
  );
}

function wrapHighlight(md: string, match: string, offset: number): string {
  if (match.includes('==')) return match;
  if (isInsideMarkdownToken(md, offset)) return match;
  const around = md.slice(Math.max(0, offset - 2), offset + match.length + 2);
  if (around.includes(`==${match}==`)) return match;
  return `**==${match}==**`;
}

/** Wrap numeric / complexity tokens in ==highlight== unless already formatted. */
function highlightNumbersAndMetrics(md: string): string {
  const patterns: RegExp[] = [
    /\bO\([^)\n]{1,40}\)/gi,
    /\b\d+(\.\d+)?\s*%/g,
    /\b\d+(\.\d+)?\s*(ms|sec(?:onds?)?|minutes?|hours?|GB|MB|KB|TB)\b/gi,
    /\b\d+(\.\d+)?\s*[-–]\s*\d+(\.\d+)?/g,
    /\b\d+(\.\d+)?\s*(representatives?|clusters?|points?|dimensions?)\b/gi,
  ];

  let result = md;
  for (const pattern of patterns) {
    result = result.replace(pattern, (match, offset: number) =>
      wrapHighlight(result, match, offset)
    );
  }

  return result.replace(/==+([^=\n]+)==+/g, '==$1==');
}

/** Bold leading label on each bullet (text before colon, or first phrase). */
function boldBulletHighlights(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      const bullet = line.match(/^(\s*[-*+]\s+)(.+)$/);
      if (!bullet) return line;

      const prefix = bullet[1];
      let content = bullet[2]!;
      if (content.includes('**')) return line;

      const colonIdx = content.indexOf(':');
      if (colonIdx > 0 && colonIdx < 80) {
        const label = content.slice(0, colonIdx).trim();
        const rest = content.slice(colonIdx + 1).trim();
        return `${prefix}**${label}**: ${rest}`;
      }

      const words = content.split(/\s+/);
      if (words.length >= 7) {
        const lead = words.slice(0, 5).join(' ');
        const rest = words.slice(5).join(' ');
        return `${prefix}**${lead}** ${rest}`;
      }

      if (words.length >= 3) {
        return `${prefix}**${content}**`;
      }

      return line;
    })
    .join('\n');
}

/** Bold important domain terms on first occurrence (never inside # headings). */
function boldKeyTerms(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      out.push(line);
      continue;
    }
    out.push(boldKeyTermsInLine(line));
  }
  return out.join('\n');
}

function boldKeyTermsInLine(line: string): string {
  const terms = [
    'CURE algorithm',
    'clustering technique',
    'clustering',
    'time complexity',
    'space complexity',
    'big data analytics',
    'representative points',
    'outliers',
    'centroid',
    'Euclidean',
    'Jaccard',
    'cosine similarity',
  ];

  let result = line;
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<!\\*\\*)\\b(${escaped})\\b(?!\\*\\*)`, 'i');
    result = result.replace(re, '**$1**');
  }
  return result;
}

/** Turn plain "Key points..." lines into section headers. */
function structurePlainSections(md: string): string {
  return md
    .replace(
      /^(Key points[^:\n]*|Key highlights[^:\n]*|Exam takeaways[^:\n]*|Advantages[^:\n]*):?\s*$/gim,
      '## $1'
    )
    .replace(
      /^(The [A-Z][A-Za-z0-9\s]+ algorithm is[^.\n]+\.)\s*$/gm,
      '$1\n'
    );
}

/** Convert legacy plain-text blocks (no # / ##) into basic markdown sections. */
function plainTextToMarkdown(md: string): string {
  const trimmed = md.trim();
  if (/^#\s/m.test(trimmed) || /^##\s/m.test(trimmed)) {
    return trimmed;
  }

  const bulletSplit = trimmed.split(/\n(?=\s*[*•-]\s+)/);
  if (bulletSplit.length > 1) {
    const [intro, ...items] = bulletSplit;
    const topic =
      intro.match(/^([^.]{10,100})/)?.[1]?.trim() ?? 'Video summary';
    const bullets = items
      .map((b) => b.replace(/^\s*[*•-]\s+/, '- ').trim())
      .join('\n');
    return `# ${topic}\n\n${intro.trim()}\n\n## Key highlights\n\n${bullets}`;
  }

  const parts = trimmed.split(/\n\n+/);
  if (parts.length <= 1) return trimmed;

  const [first, ...rest] = parts;
  const topic =
    first.match(/^([^.]{10,100})/)?.[1]?.trim() ?? 'Video summary';
  return `# ${topic}\n\n${first}\n\n${rest.join('\n\n')}`;
}

/** Turn key-section paragraphs into markdown bullets. */
function convertKeyPointParagraphsToBullets(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inKeySection = false;

  for (const line of lines) {
    if (/^##\s+(Key highlights|Key points)/i.test(line)) {
      inKeySection = true;
      out.push(line);
      continue;
    }
    if (/^##\s+/.test(line)) {
      inKeySection = false;
    }

    const trimmed = line.trim();
    if (inKeySection && trimmed) {
      if (/^[-*+•]\s/.test(trimmed)) {
        out.push(`- ${trimmed.replace(/^[-*+•]\s+/, '')}`);
        continue;
      }

      const isKeyPoint =
        /^\*\*/.test(trimmed) ||
        /^It\s+(is|has|have|can|uses|automatically)/i.test(trimmed) ||
        /^The\s+(CURE|algorithm)/i.test(trimmed);

      if (isKeyPoint) {
        out.push(`- ${trimmed}`);
        continue;
      }
    }

    out.push(line);
  }

  return out.join('\n');
}

/** Main entry: run all enrichments in a safe order. */
export function enrichSummaryMarkdown(raw: string): string {
  if (!raw.trim()) return raw;

  let md = raw.replace(/\r\n/g, '\n').trim();
  md = plainTextToMarkdown(md);
  md = structurePlainSections(md);
  md = convertKeyPointParagraphsToBullets(md);
  md = boldKeyTerms(md);
  md = boldBulletHighlights(md);
  md = highlightNumbersAndMetrics(md);
  md = stripMarkdownFromHeadings(md);

  return md;
}
