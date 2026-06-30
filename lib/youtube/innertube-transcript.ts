type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
};

type InnertubeClient = {
  clientName: string;
  clientVersion: string;
  androidSdkVersion?: number;
  hl?: string;
  gl?: string;
};

const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLgcilr_Yp_iiqcXt';

const CLIENTS: InnertubeClient[] = [
  {
    clientName: 'ANDROID',
    clientVersion: '20.10.38',
    androidSdkVersion: 30,
    hl: 'en',
    gl: 'US',
  },
  {
    clientName: 'IOS',
    clientVersion: '20.10.4',
    hl: 'en',
    gl: 'US',
  },
  {
    clientName: 'WEB',
    clientVersion: '2.20250305.01.00',
    hl: 'en',
    gl: 'US',
  },
  {
    clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
    clientVersion: '2.0',
    hl: 'en',
    gl: 'US',
  },
];

const PREFERRED_LANGS = ['en', 'en-US', 'en-GB', 'a.en', 'en-orig'];

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function pickCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (tracks.length === 0) return null;

  for (const lang of PREFERRED_LANGS) {
    const match = tracks.find((t) => t.languageCode === lang);
    if (match) return match;
  }

  const manual = tracks.find((t) => t.kind !== 'asr');
  return manual ?? tracks[0];
}

function extractCaptionTracks(payload: unknown): CaptionTrack[] {
  const data = payload as {
    captions?: {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: CaptionTrack[];
      };
    };
  };

  return (
    data.captions?.playerCaptionsTracklistRenderer?.captionTracks?.filter(
      (track) => typeof track.baseUrl === 'string' && track.baseUrl.length > 0
    ) ?? []
  );
}

function extractTranscriptParams(payload: unknown): string | null {
  const json = JSON.stringify(payload);
  const match = json.match(
    /"getTranscriptEndpoint"\s*:\s*\{\s*"params"\s*:\s*"([^"]+)"/
  );
  return match?.[1] ?? null;
}

function collectRunsText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';

  const obj = node as Record<string, unknown>;

  if (typeof obj.text === 'string') return obj.text;

  if (Array.isArray(obj.runs)) {
    return obj.runs.map(collectRunsText).join('');
  }

  let out = '';
  for (const value of Object.values(obj)) {
    if (typeof value === 'string') {
      out += value;
    } else if (Array.isArray(value) || (value && typeof value === 'object')) {
      out += collectRunsText(value);
    }
  }
  return out;
}

function parseGetTranscriptResponse(payload: unknown): string | null {
  const json = JSON.stringify(payload);

  const snippetTexts = [
    ...json.matchAll(/"snippet"\s*:\s*\{[^}]*"text"\s*:\s*\{[^}]+\}/g),
  ];
  if (snippetTexts.length === 0) {
    const fallback = collectRunsText(payload)
      .replace(/\s+/g, ' ')
      .trim();
    return fallback.length > 20 ? fallback : null;
  }

  const segments: string[] = [];

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;

    if (obj.snippet && typeof obj.snippet === 'object') {
      const snippet = obj.snippet as Record<string, unknown>;
      if (snippet.text) {
        const text = collectRunsText(snippet.text).trim();
        if (text) segments.push(text);
      }
    }

    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value && typeof value === 'object') {
        walk(value);
      }
    }
  };

  walk(payload);

  const text = segments.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
}

function parseJson3Transcript(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as {
      events?: Array<{ segs?: Array<{ utf8?: string }> }>;
    };

    const text = (data.events ?? [])
      .flatMap((event) => event.segs ?? [])
      .map((seg) => seg.utf8 ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();

    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

function parseXmlTranscript(raw: string): string | null {
  const matches = [...raw.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
  if (matches.length === 0) return null;

  const text = matches
    .map((match) =>
      match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, ' ')
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 0 ? text : null;
}

async function fetchPlayerPayload(
  videoId: string,
  client: InnertubeClient,
  fetchFn: typeof fetch
): Promise<unknown | null> {
  const res = await fetchFn(
    `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: JSON.stringify({
        context: { client },
        videoId,
      }),
      cache: 'no-store',
    }
  );

  if (!res.ok) return null;
  return res.json();
}

async function fetchWatchPageParams(
  videoId: string,
  fetchFn: typeof fetch
): Promise<string | null> {
  const res = await fetchFn(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(
    /"getTranscriptEndpoint"\s*:\s*\{\s*"params"\s*:\s*"([^"]+)"/
  );
  return match?.[1] ?? null;
}

async function fetchViaGetTranscriptEndpoint(
  params: string,
  client: InnertubeClient,
  fetchFn: typeof fetch
): Promise<string | null> {
  const res = await fetchFn(
    `https://www.youtube.com/youtubei/v1/get_transcript?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': MOBILE_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: JSON.stringify({
        context: { client },
        params,
      }),
      cache: 'no-store',
    }
  );

  if (!res.ok) return null;
  const payload = await res.json();
  return parseGetTranscriptResponse(payload);
}

async function fetchCaptionText(
  track: CaptionTrack,
  fetchFn: typeof fetch
): Promise<string | null> {
  const jsonUrl = `${track.baseUrl}${track.baseUrl.includes('?') ? '&' : '?'}fmt=json3`;

  const jsonRes = await fetchFn(jsonUrl, {
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    cache: 'no-store',
  });

  if (jsonRes.ok) {
    const parsed = parseJson3Transcript(await jsonRes.text());
    if (parsed) return parsed;
  }

  const xmlRes = await fetchFn(track.baseUrl, {
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    cache: 'no-store',
  });

  if (!xmlRes.ok) return null;
  return parseXmlTranscript(await xmlRes.text());
}

/**
 * Fetches transcript via YouTube InnerTube APIs (player + get_transcript).
 * Avoids the HTML scraper that fails on Vercel datacenter IPs.
 */
export async function fetchInnertubeTranscript(
  videoId: string,
  fetchFn: typeof fetch = fetch
): Promise<string | null> {
  let transcriptParams: string | null = null;

  for (const client of CLIENTS) {
    try {
      const payload = await fetchPlayerPayload(videoId, client, fetchFn);
      if (!payload) continue;

      if (!transcriptParams) {
        transcriptParams =
          extractTranscriptParams(payload) ??
          (await fetchWatchPageParams(videoId, fetchFn));
      }

      if (transcriptParams) {
        const viaEndpoint = await fetchViaGetTranscriptEndpoint(
          transcriptParams,
          client,
          fetchFn
        );
        if (viaEndpoint) return viaEndpoint;
      }

      const tracks = extractCaptionTracks(payload);
      const track = pickCaptionTrack(tracks);
      if (!track) continue;

      const viaCaptions = await fetchCaptionText(track, fetchFn);
      if (viaCaptions) return viaCaptions;
    } catch (err) {
      console.warn(
        `[youtube innertube] ${client.clientName} failed for ${videoId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return null;
}
