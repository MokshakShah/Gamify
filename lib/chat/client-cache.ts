/**
 * Browser cache for chat history — instant sidebar load, invalidated on delete.
 * Keyed by public chatId (URL slug) per Clerk user.
 */

export type CachedChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type CachedChatThread = {
  chatId: string;
  title: string;
  updatedAt: string;
};

export type ChatClientCache = {
  v: 2;
  threads: CachedChatThread[];
  messagesByChatId: Record<string, CachedChatMessage[]>;
  syncedAt: string;
};

const CACHE_VERSION = 2;

function storageKey(clerkUserId: string): string {
  return `gamify:chat:v${CACHE_VERSION}:${clerkUserId}`;
}

export function readChatCache(clerkUserId: string): ChatClientCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(clerkUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatClientCache;
    if (parsed?.v !== CACHE_VERSION || !Array.isArray(parsed.threads)) {
      return null;
    }
    parsed.messagesByChatId ??= {};
    return parsed;
  } catch {
    return null;
  }
}

export function writeChatCache(
  clerkUserId: string,
  cache: ChatClientCache
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
    /* quota exceeded */
  }
}

export function removeThreadFromCache(
  clerkUserId: string,
  chatId: string
): void {
  const cache = readChatCache(clerkUserId);
  if (!cache) return;

  const next: ChatClientCache = {
    ...cache,
    threads: cache.threads.filter((t) => t.chatId !== chatId),
    messagesByChatId: { ...cache.messagesByChatId },
  };
  delete next.messagesByChatId[chatId];
  writeChatCache(clerkUserId, next);
}

export function setThreadMessagesInCache(
  clerkUserId: string,
  chatId: string,
  messages: CachedChatMessage[]
): void {
  const cache = readChatCache(clerkUserId) ?? {
    v: CACHE_VERSION,
    threads: [],
    messagesByChatId: {},
    syncedAt: new Date().toISOString(),
  };

  writeChatCache(clerkUserId, {
    ...cache,
    messagesByChatId: {
      ...cache.messagesByChatId,
      [chatId]: messages,
    },
  });
}

export function appendMessageToCache(
  clerkUserId: string,
  chatId: string,
  message: CachedChatMessage,
  threadMeta?: Partial<CachedChatThread>
): void {
  const cache = readChatCache(clerkUserId) ?? {
    v: CACHE_VERSION,
    threads: [],
    messagesByChatId: {},
    syncedAt: new Date().toISOString(),
  };

  const existing = cache.messagesByChatId[chatId] ?? [];
  let threads = cache.threads.map((t) =>
    t.chatId === chatId && threadMeta
      ? { ...t, ...threadMeta, updatedAt: threadMeta.updatedAt ?? t.updatedAt }
      : t
  );

  if (threadMeta && !threads.some((t) => t.chatId === chatId)) {
    threads = [
      {
        chatId,
        title: threadMeta.title ?? 'New chat',
        updatedAt: threadMeta.updatedAt ?? new Date().toISOString(),
      },
      ...threads,
    ];
  }

  writeChatCache(clerkUserId, {
    ...cache,
    threads,
    messagesByChatId: {
      ...cache.messagesByChatId,
      [chatId]: [...existing, message],
    },
  });
}

export function replaceThreadsInCache(
  clerkUserId: string,
  threads: CachedChatThread[]
): void {
  const cache = readChatCache(clerkUserId) ?? {
    v: CACHE_VERSION,
    threads: [],
    messagesByChatId: {},
    syncedAt: new Date().toISOString(),
  };

  writeChatCache(clerkUserId, { ...cache, threads });
}

export function updateThreadTitleInCache(
  clerkUserId: string,
  chatId: string,
  title: string,
  updatedAt: string
): void {
  const cache = readChatCache(clerkUserId);
  if (!cache) return;

  writeChatCache(clerkUserId, {
    ...cache,
    threads: cache.threads.map((t) =>
      t.chatId === chatId ? { ...t, title, updatedAt } : t
    ),
  });
}
