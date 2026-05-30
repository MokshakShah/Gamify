import { YoutubeTranscript } from 'youtube-transcript';

const MAX_TRANSCRIPT_CHARS = 48_000;

function joinTranscript(
  chunks: { text: string }[]
): string {
  return chunks
    .map((c) => c.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function tryFetch(
  videoId: string,
  lang?: string
): Promise<string | null> {
  try {
    const chunks = lang
      ? await YoutubeTranscript.fetchTranscript(videoId, { lang })
      : await YoutubeTranscript.fetchTranscript(videoId);
    const text = joinTranscript(chunks);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Returns full transcript text or null if captions are unavailable / disabled.
 */
export async function fetchYoutubeTranscript(
  videoId: string
): Promise<string | null> {
  const langs = ['en', 'en-US', 'en-GB'];
  for (const lang of langs) {
    const text = await tryFetch(videoId, lang);
    if (text) return truncateTranscript(text);
  }
  const fallback = await tryFetch(videoId);
  return fallback ? truncateTranscript(fallback) : null;
}

function truncateTranscript(text: string): string {
  if (text.length <= MAX_TRANSCRIPT_CHARS) return text;
  return (
    text.slice(0, MAX_TRANSCRIPT_CHARS) +
    '\n\n[Transcript truncated for length — summary covers the start of the video.]'
  );
}
