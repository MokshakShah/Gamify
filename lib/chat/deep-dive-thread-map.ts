/**
 * Maps a summaryId to its deep-dive chatId for a specific user.
 */

export type DeepDiveThreadMap = {
  v: 1;
  bySummaryId: Record<string, string>;
  updatedAt: string;
};

const CACHE_VERSION = 1;

function storageKey(clerkUserId: string): string {
  return `gamify:chat:deep-dive-map:v${CACHE_VERSION}:${clerkUserId}`;
}

function readMap(clerkUserId: string): DeepDiveThreadMap | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(clerkUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeepDiveThreadMap;
    if (parsed?.v !== CACHE_VERSION || !parsed.bySummaryId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeMap(clerkUserId: string, map: DeepDiveThreadMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(clerkUserId), JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getDeepDiveThreadId(
  clerkUserId: string,
  summaryId: string
): string | null {
  const map = readMap(clerkUserId);
  return map?.bySummaryId?.[summaryId] ?? null;
}

export function setDeepDiveThreadId(
  clerkUserId: string,
  summaryId: string,
  chatId: string
): void {
  const map = readMap(clerkUserId) ?? {
    v: CACHE_VERSION,
    bySummaryId: {},
    updatedAt: new Date().toISOString(),
  };
  writeMap(clerkUserId, {
    ...map,
    bySummaryId: { ...map.bySummaryId, [summaryId]: chatId },
    updatedAt: new Date().toISOString(),
  });
}

export function clearDeepDiveThreadId(
  clerkUserId: string,
  summaryId: string
): void {
  const map = readMap(clerkUserId);
  if (!map) return;
  const next = { ...map.bySummaryId };
  delete next[summaryId];
  writeMap(clerkUserId, {
    ...map,
    bySummaryId: next,
    updatedAt: new Date().toISOString(),
  });
}

export function clearDeepDiveThreadByChatId(
  clerkUserId: string,
  chatId: string
): void {
  const map = readMap(clerkUserId);
  if (!map) return;
  const next: Record<string, string> = {};
  for (const [summaryId, mapped] of Object.entries(map.bySummaryId)) {
    if (mapped !== chatId) next[summaryId] = mapped;
  }
  writeMap(clerkUserId, {
    ...map,
    bySummaryId: next,
    updatedAt: new Date().toISOString(),
  });
}
