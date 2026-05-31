/**
 * Local-only deep-dive context seeded from a summary.
 * Stored per user + chatId to inform model prompts.
 */

export type DeepDiveContext = {
  summaryId: string;
  topic: string;
  title: string;
  channelName: string;
  sourceUrl: string;
  summary: string;
};

const CACHE_VERSION = 1;

function storageKey(clerkUserId: string, chatId: string): string {
  return `gamify:chat:deep-dive:v${CACHE_VERSION}:${clerkUserId}:${chatId}`;
}

export function writeDeepDiveContext(
  clerkUserId: string,
  chatId: string,
  context: DeepDiveContext
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(clerkUserId, chatId), JSON.stringify(context));
  } catch {
    /* ignore */
  }
}

export function readDeepDiveContext(
  clerkUserId: string,
  chatId: string
): DeepDiveContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(clerkUserId, chatId));
    if (!raw) return null;
    return JSON.parse(raw) as DeepDiveContext;
  } catch {
    return null;
  }
}

export function clearDeepDiveContext(
  clerkUserId: string,
  chatId: string
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(clerkUserId, chatId));
  } catch {
    /* ignore */
  }
}
