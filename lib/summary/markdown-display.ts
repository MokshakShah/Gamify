/** Plain display text — no raw `**`, `==`, or markdown link syntax. */
export function stripMarkdownForDisplay(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/==/g, '')
    .trim();
}

/** Remove emphasis markers from # / ## heading lines (titles must stay plain). */
export function stripMarkdownFromHeadings(md: string): string {
  return md.replace(/^(#{1,3}\s+)(.+)$/gm, (_, hashes, title: string) => {
    return `${hashes}${stripMarkdownForDisplay(title)}`;
  });
}
