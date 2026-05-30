/**
 * Browser cache for YouTube upload history — instant sidebar, summary loaded per item.
 */

export type CachedUploadMeta = {
  id: string;
  videoId: string;
  sourceUrl: string;
  title: string;
  channelName: string;
  status: string;
  createdAt: string;
};

export type CachedUploadDetail = CachedUploadMeta & {
  summary: string | null;
  errorMessage: string | null;
};

export type UploadClientCache = {
  v: 1;
  items: CachedUploadMeta[];
  detailsById: Record<string, CachedUploadDetail>;
  syncedAt: string;
};

const CACHE_VERSION = 1;

function storageKey(clerkUserId: string): string {
  return `gamify:upload:v${CACHE_VERSION}:${clerkUserId}`;
}

export function readUploadCache(clerkUserId: string): UploadClientCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(clerkUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UploadClientCache;
    if (parsed?.v !== CACHE_VERSION || !Array.isArray(parsed.items)) return null;
    parsed.detailsById ??= {};
    return parsed;
  } catch {
    return null;
  }
}

export function writeUploadCache(
  clerkUserId: string,
  cache: UploadClientCache
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      storageKey(clerkUserId),
      JSON.stringify({
        ...cache,
        v: CACHE_VERSION,
        syncedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* quota */
  }
}

export function replaceUploadMetaInCache(
  clerkUserId: string,
  items: CachedUploadMeta[]
): void {
  const cache = readUploadCache(clerkUserId) ?? {
    v: CACHE_VERSION,
    items: [],
    detailsById: {},
    syncedAt: new Date().toISOString(),
  };
  writeUploadCache(clerkUserId, { ...cache, items });
}

export function setUploadDetailInCache(
  clerkUserId: string,
  detail: CachedUploadDetail
): void {
  const cache = readUploadCache(clerkUserId) ?? {
    v: CACHE_VERSION,
    items: [],
    detailsById: {},
    syncedAt: new Date().toISOString(),
  };
  const meta: CachedUploadMeta = {
    id: detail.id,
    videoId: detail.videoId,
    sourceUrl: detail.sourceUrl,
    title: detail.title,
    channelName: detail.channelName,
    status: detail.status,
    createdAt: detail.createdAt,
  };
  const items = [
    meta,
    ...cache.items.filter((i) => i.id !== detail.id),
  ];
  writeUploadCache(clerkUserId, {
    ...cache,
    items,
    detailsById: { ...cache.detailsById, [detail.id]: detail },
  });
}

export function removeUploadFromCache(
  clerkUserId: string,
  summaryId: string
): void {
  const cache = readUploadCache(clerkUserId);
  if (!cache) return;
  const detailsById = { ...cache.detailsById };
  delete detailsById[summaryId];
  writeUploadCache(clerkUserId, {
    ...cache,
    items: cache.items.filter((i) => i.id !== summaryId),
    detailsById,
  });
}

export function updateUploadTitleInCache(
  clerkUserId: string,
  summaryId: string,
  title: string
): void {
  const cache = readUploadCache(clerkUserId);
  if (!cache) return;
  writeUploadCache(clerkUserId, {
    ...cache,
    items: cache.items.map((i) =>
      i.id === summaryId ? { ...i, title } : i
    ),
    detailsById: cache.detailsById[summaryId]
      ? {
          ...cache.detailsById,
          [summaryId]: { ...cache.detailsById[summaryId]!, title },
        }
      : cache.detailsById,
  });
}
