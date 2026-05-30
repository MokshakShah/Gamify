/**
 * Strips common YouTube title suffixes (channel name, series tags) for display & prompts.
 */
export function cleanYoutubeTitle(raw: string): string {
  let title = raw.trim();
  if (!title) return 'YouTube video';

  // "Topic | Channel" or "Topic - Channel"
  const pipeSplit = title.split(/\s*[|]\s*/);
  if (pipeSplit.length > 1) {
    title = pipeSplit[0]!.trim();
  }

  const dashMatch = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dashMatch) {
    const left = dashMatch[1]!.trim();
    const right = dashMatch[2]!.trim();
    // Keep left part when right looks like a channel/series (short or has "At A Glance", etc.)
    if (
      right.length < 40 ||
      /at a glance|lecture|tutorial|full course|ep\.?\s*\d/i.test(right)
    ) {
      title = left;
    }
  }

  title = title
    .replace(/\s*#\w+/g, '')
    .replace(/\s*\([^)]*minutes?[^)]*\)\s*$/i, '')
    .trim();

  return title || raw.trim();
}
