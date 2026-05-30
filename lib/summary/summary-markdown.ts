import { enrichSummaryMarkdown } from '@/lib/summary/enrich-summary-markdown';
import { stripMarkdownForDisplay } from '@/lib/summary/markdown-display';

export { stripMarkdownForDisplay, stripMarkdownFromHeadings } from '@/lib/summary/markdown-display';

/** Normalize + emphasize markdown, then map `==value==` to highlight links. */
export function prepareSummaryForDisplay(markdown: string): string {
  const enriched = enrichSummaryMarkdown(markdown);
  return enriched.replace(
    /\*\*==([^=\n]+)==\*\*/g,
    '[**$1**](gamify-highlight:)'
  ).replace(/==([^=\n]+)==/g, '[**$1**](gamify-highlight:)');
}

/** @deprecated Use prepareSummaryForDisplay */
export function preprocessSummaryHighlights(markdown: string): string {
  return prepareSummaryForDisplay(markdown);
}
/** First `# Topic` line from model output, if present. */
export function extractSummaryTopic(
  summary: string,
  fallbackTitle: string
): string {
  const match = summary.match(/^#\s+(.+)$/m);
  const raw = match?.[1]?.trim() ?? fallbackTitle;
  return stripMarkdownForDisplay(raw);
}

/** Body markdown without the leading `# Topic` heading (shown separately in UI). */
export function stripLeadingTopicHeading(summary: string): string {
  return summary.replace(/^#\s+.+\n+/, '').trim();
}

/** Plain text for PDF export (no markdown). */
export function summaryToPlainText(summary: string): string {
  return summary
    .replace(/^#\s+/gm, '')
    .replace(/^##\s+/gm, '')
    .replace(/^###\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/\[([^\]]+)\]\(gamify-highlight:\)/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .trim();
}
