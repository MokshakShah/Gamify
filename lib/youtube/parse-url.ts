export type ParsedYoutubeUrl = {
  videoId: string;
  normalizedUrl: string;
};

const VIDEO_ID = /^[\w-]{11}$/;

/**
 * Validates and extracts a YouTube video id from common URL shapes.
 */
export function parseYoutubeUrl(raw: string): ParsedYoutubeUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  let videoId: string | null = null;

  if (host === 'youtu.be') {
    videoId = url.pathname.slice(1).split('/')[0] ?? null;
  } else if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com'
  ) {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v');
    } else if (url.pathname.startsWith('/embed/')) {
      videoId = url.pathname.split('/')[2] ?? null;
    } else if (url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.split('/')[2] ?? null;
    } else if (url.pathname.startsWith('/live/')) {
      videoId = url.pathname.split('/')[2] ?? null;
    }
  }

  if (!videoId || !VIDEO_ID.test(videoId)) return null;

  return {
    videoId,
    normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export function isYoutubeUrl(raw: string): boolean {
  return parseYoutubeUrl(raw) !== null;
}
