import { fetchInnertubeTranscript } from '@/lib/youtube/innertube-transcript';

const MAX_TRANSCRIPT_CHARS = 48_000;

function joinTranscript(chunks: { text: string }[]): string {
  return chunks
    .map((c) => c.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function tryLegacyFetch(
  videoId: string,
  lang?: string
): Promise<string | null> {
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    const chunks = lang
      ? await YoutubeTranscript.fetchTranscript(videoId, { lang })
      : await YoutubeTranscript.fetchTranscript(videoId);
    const text = joinTranscript(chunks);
    return text.length > 0 ? text : null;
  } catch (err) {
    console.warn(
      `[youtube legacy] ${lang ?? 'default'} failed for ${videoId}:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

function truncateTranscript(text: string): string {
  if (text.length <= MAX_TRANSCRIPT_CHARS) return text;
  return (
    text.slice(0, MAX_TRANSCRIPT_CHARS) +
    '\n\n[Transcript truncated for length — summary covers the start of the video.]'
  );
}

/**
 * Returns full transcript text or null if captions are unavailable / blocked.
 * Tries InnerTube first (works on Vercel), then legacy scraper (local dev fallback).
 */
export async function fetchYoutubeTranscript(
  videoId: string
): Promise<string | null> {
  const innertube = await fetchInnertubeTranscript(videoId);
  if (innertube) {
    return truncateTranscript(innertube);
  }

  const langs = ['en', 'en-US', 'en-GB'];
  for (const lang of langs) {
    const text = await tryLegacyFetch(videoId, lang);
    if (text) return truncateTranscript(text);
  }

  const fallback = await tryLegacyFetch(videoId);
  return fallback ? truncateTranscript(fallback) : null;
}
