'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, SendHorizontal, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HistorySidebarRow } from '@/components/dashboard/HistorySidebarRow';
import { ResizableHistorySidebar } from '@/components/dashboard/ResizableHistorySidebar';
import {
  appendMessageToCache,
  readChatCache,
  removeThreadFromCache,
  replaceThreadsInCache,
  setThreadMessagesInCache,
  updateThreadTitleInCache,
  type CachedChatMessage,
  type CachedChatThread,
} from '@/lib/chat/client-cache';
import {
  clearDeepDiveContext,
  readDeepDiveContext,
} from '@/lib/chat/deep-dive-context';
import { clearDeepDiveThreadByChatId } from '@/lib/chat/deep-dive-thread-map';
import { chatDashboardPath, chatShareUrl } from '@/lib/chat/urls';
import { stripMarkdownForDisplay } from '@/lib/summary/markdown-display';
import { cn } from '@/lib/utils';

type Role = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}

interface ChatThread {
  chatId: string;
  title: string;
  updatedAt: string;
}

type PendingAttachment = {
  id: string;
  fileName: string;
  url: string;
};


function cachedToMessage(m: CachedChatMessage): ChatMessage {
  return { id: m.id, role: m.role, content: m.content };
}

function apiToCachedThread(t: {
  chatId: string;
  title: string;
  updatedAt: string;
}): CachedChatThread {
  return { chatId: t.chatId, title: t.title, updatedAt: t.updatedAt };
}

type ChatWorkspaceProps = {
  /** Public chat id from the URL (/dashboard/chat/[chatId]). */
  urlChatId?: string;
};

export function ChatWorkspace({ urlChatId }: ChatWorkspaceProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatThread | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const listLoadedRef = useRef(false);

  const resolvedChatId = urlChatId ?? pendingChatId ?? undefined;
  const active =
    threads.find((t) => t.chatId === resolvedChatId) ??
    (resolvedChatId
      ? { chatId: resolvedChatId, title: 'Chat', updatedAt: '' }
      : null);
  const messages = resolvedChatId
    ? (messagesByChat[resolvedChatId] ?? [])
    : [];

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!autoScroll) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, resolvedChatId, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distanceToBottom < 80);
  };

  useEffect(() => {
    if (urlChatId) setPendingChatId(null);
  }, [urlChatId]);

  const loadThreadMessages = useCallback(
    async (uid: string, chatId: string, useCacheFirst = true) => {
      if (useCacheFirst) {
        const cache = readChatCache(uid);
        const cached = cache?.messagesByChatId[chatId];
        if (cached?.length) {
          setMessagesByChat((prev) => ({
            ...prev,
            [chatId]: cached.map(cachedToMessage),
          }));
        }
      }

      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/chat/threads/${encodeURIComponent(chatId)}`);
        if (res.status === 404) {
          router.replace('/dashboard/chat');
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          thread: { chatId: string; title: string; updatedAt: string };
          messages: CachedChatMessage[];
        };
        const msgs = data.messages.map(cachedToMessage);
        setMessagesByChat((prev) => ({ ...prev, [chatId]: msgs }));
        setThreadMessagesInCache(uid, chatId, data.messages);
        setThreads((prev) => {
          const exists = prev.some((t) => t.chatId === chatId);
          const row = apiToCachedThread(data.thread);
          if (exists) {
            return prev.map((t) => (t.chatId === chatId ? row : t));
          }
          return [row, ...prev];
        });
      } finally {
        setLoadingMessages(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      if (isLoaded && !isSignedIn) setLoadingList(false);
      return;
    }

    if (listLoadedRef.current) return;

    let cancelled = false;

    const boot = async () => {
      const cache = readChatCache(userId);
      if (cache?.threads.length) {
        setThreads(cache.threads);
        const msgMap: Record<string, ChatMessage[]> = {};
        for (const [cid, msgs] of Object.entries(cache.messagesByChatId)) {
          msgMap[cid] = msgs.map(cachedToMessage);
        }
        setMessagesByChat(msgMap);
      }

      setLoadingList(true);
      try {
        const res = await fetch('/api/chat/threads');
        if (cancelled || !res.ok) return;
        const list = ((await res.json()) as { threads: ChatThread[] }).threads;
        setThreads(list);
        replaceThreadsInCache(userId, list.map(apiToCachedThread));

        const hasUrl = list.some((t) => t.chatId === urlChatId);
        if (!hasUrl && urlChatId) {
          router.replace('/dashboard/chat');
          return;
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
          listLoadedRef.current = true;
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId, urlChatId, router]);

  useEffect(() => {
    if (!userId || !urlChatId || !listLoadedRef.current) return;
    void loadThreadMessages(userId, urlChatId, true);
  }, [userId, urlChatId, loadThreadMessages]);

  const navigateToChat = (chatId: string) => {
    router.push(chatDashboardPath(chatId));
    setPendingChatId(null);
    setInput('');
  };

  const newChat = async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/chat/threads', { method: 'POST' });
      if (!res.ok) return;
      const data = (await res.json()) as { thread: ChatThread };
      const t = data.thread;
      setThreads((prev) => {
        const next = [t, ...prev.filter((x) => x.chatId !== t.chatId)];
        replaceThreadsInCache(userId, next.map(apiToCachedThread));
        return next;
      });
      setMessagesByChat((prev) => ({ ...prev, [t.chatId]: [] }));
      setThreadMessagesInCache(userId, t.chatId, []);
      router.push(chatDashboardPath(t.chatId));
      setInput('');
    } catch {
      /* ignore */
    }
  };

  const ensureThread = async (): Promise<ChatThread | null> => {
    if (!userId) return null;
    try {
      const res = await fetch('/api/chat/threads', { method: 'POST' });
      if (!res.ok) return null;
      const data = (await res.json()) as { thread: ChatThread };
      const t = data.thread;
      setThreads((prev) => {
        const next = [t, ...prev.filter((x) => x.chatId !== t.chatId)];
        replaceThreadsInCache(userId, next.map(apiToCachedThread));
        return next;
      });
      setMessagesByChat((prev) => ({ ...prev, [t.chatId]: [] }));
      setThreadMessagesInCache(userId, t.chatId, []);
      setPendingChatId(t.chatId);
      return t;
    } catch {
      return null;
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!userId) return;

    removeThreadFromCache(userId, chatId);
    clearDeepDiveThreadByChatId(userId, chatId);
    clearDeepDiveContext(userId, chatId);

    const next = threads.filter((t) => t.chatId !== chatId);
    setThreads(next);
    setMessagesByChat((prev) => {
      const copy = { ...prev };
      delete copy[chatId];
      return copy;
    });

    if (chatId === urlChatId) {
      const fallback = next[0]?.chatId;
      router.push(fallback ? chatDashboardPath(fallback) : '/dashboard/chat');
    }

    try {
      await fetch(`/api/chat/threads/${encodeURIComponent(chatId)}`, {
        method: 'DELETE',
      });
    } catch {
      /* ignore */
    }
  };

  const requestDeleteChat = (chatId: string) => {
    const target = threads.find((t) => t.chatId === chatId) ?? {
      chatId,
      title: 'Chat',
      updatedAt: '',
    };
    setDeleteTarget(target);
  };

  const confirmDeleteChat = async () => {
    if (!deleteTarget) return;
    const chatId = deleteTarget.chatId;
    setDeleteTarget(null);
    await deleteChat(chatId);
  };

  const commitRenameChat = async (chatId: string, nextTitle: string) => {
    if (!userId) return;

    setThreads((prev) =>
      prev.map((t) => (t.chatId === chatId ? { ...t, title: nextTitle } : t))
    );
    updateThreadTitleInCache(
      userId,
      chatId,
      nextTitle,
      new Date().toISOString()
    );
    setRenamingChatId(null);

    try {
      const res = await fetch(
        `/api/chat/threads/${encodeURIComponent(chatId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: nextTitle }),
        }
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        thread: { title: string; updatedAt: string };
      };
      setThreads((prev) =>
        prev.map((t) =>
          t.chatId === chatId
            ? { ...t, title: data.thread.title, updatedAt: data.thread.updatedAt }
            : t
        )
      );
    } catch {
      /* ignore */
    }
  };

  const shareChat = async (chatId: string) => {
    const url = chatShareUrl(chatId);
    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied to clipboard');
    } catch {
      setToast(url);
    }
  };

  const send = async () => {
    const trimmed = input.trim();
    if ((!trimmed && pendingAttachments.length === 0) || !userId || sending) {
      return;
    }

    setSending(true);
    let chatId = resolvedChatId;
    let threadTitle = active?.title ?? 'New chat';
    const shouldNavigate = !urlChatId;
    if (!chatId) {
      const created = await ensureThread();
      if (!created) {
        setSending(false);
        return;
      }
      chatId = created.chatId;
      threadTitle = created.title;
    }

    const attachmentLines = pendingAttachments.map(
      (att) => `- [${att.fileName}](${att.url})`
    );
    const attachmentBlock = attachmentLines.length
      ? `Attachments:\n${attachmentLines.join('\n')}`
      : '';
    const combinedContent = trimmed
      ? attachmentBlock
        ? `${trimmed}\n\n${attachmentBlock}`
        : trimmed
      : attachmentBlock;
    const titleSeed = trimmed || pendingAttachments[0]?.fileName || 'New chat';
    const title =
      threadTitle === 'New chat'
        ? titleSeed.slice(0, 42) + (titleSeed.length > 42 ? '…' : '')
        : threadTitle;

    const optimisticUser: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: combinedContent,
    };

    const optimisticAssistant: ChatMessage = {
      id: `tmp-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
    };

    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] ?? []), optimisticUser, optimisticAssistant],
    }));
    setInput('');

    try {
      const res = await fetch(
        `/api/chat/threads/${encodeURIComponent(chatId)}/reply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: combinedContent,
            title,
            context: readDeepDiveContext(userId, chatId),
          }),
        }
      );
      if (!res.ok || !res.body) throw new Error('save failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let pendingText = '';
      let displayText = '';
      let donePayload: {
        userMessage: CachedChatMessage;
        assistantMessage: CachedChatMessage;
        title?: string;
        updatedAt?: string;
      } | null = null;
      const attachmentsSnapshot = pendingAttachments;
      let typingTimer: ReturnType<typeof setInterval> | null = null;

      const updateAssistant = (nextText: string) => {
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] ?? []).map((m) =>
            m.id === optimisticAssistant.id ? { ...m, content: nextText } : m
          ),
        }));
      };

      const stopTyping = () => {
        if (!typingTimer) return;
        clearInterval(typingTimer);
        typingTimer = null;
      };

      const finalizeIfReady = () => {
        if (!donePayload || pendingText.length > 0) return;

        const userMsg = cachedToMessage(donePayload.userMessage);
        const assistantMsg = cachedToMessage(donePayload.assistantMessage);
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] ?? []).map((m) => {
            if (m.id === optimisticUser.id) return userMsg;
            if (m.id === optimisticAssistant.id) return assistantMsg;
            return m;
          }),
        }));

        appendMessageToCache(userId, chatId, donePayload.userMessage, {
          chatId,
          title: donePayload.title ?? threadTitle,
          updatedAt: donePayload.updatedAt ?? new Date().toISOString(),
        });
        appendMessageToCache(userId, chatId, donePayload.assistantMessage, {
          chatId,
          updatedAt: donePayload.updatedAt ?? new Date().toISOString(),
        });
        if (attachmentsSnapshot.length > 0) {
          setPendingAttachments([]);
        }
        if (donePayload.title && donePayload.updatedAt) {
          setThreads((prev) =>
            prev.map((t) =>
              t.chatId === chatId
                ? {
                    ...t,
                    title: donePayload.title!,
                    updatedAt: donePayload.updatedAt!,
                  }
                : t
            )
          );
        }
      };

      const startTyping = () => {
        if (typingTimer) return;
        typingTimer = setInterval(() => {
          if (pendingText.length === 0) {
            stopTyping();
            finalizeIfReady();
            return;
          }
          const chunk = pendingText.slice(0, 2);
          pendingText = pendingText.slice(2);
          displayText += chunk;
          updateAssistant(displayText);
        }, 90);
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          let event = 'message';
          let data = '';
          for (const line of chunk.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            if (line.startsWith('data:')) data += line.slice(5).trim();
          }

          if (data) {
            const payload = JSON.parse(data) as {
              text?: string;
              message?: string;
              userMessage?: CachedChatMessage;
              assistantMessage?: CachedChatMessage;
              title?: string;
              updatedAt?: string;
            };

            if (event === 'delta' && payload.text) {
              pendingText += payload.text;
              startTyping();
            }

            if (event === 'error') {
              setToast(payload.message ?? 'Reply failed.');
            }

            if (event === 'done' && payload.userMessage && payload.assistantMessage) {
              donePayload = {
                userMessage: payload.userMessage,
                assistantMessage: payload.assistantMessage,
                title: payload.title,
                updatedAt: payload.updatedAt,
              };
              finalizeIfReady();
            }
          }

          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch {
      stopTyping();
      setToast('Reply failed. Your message was kept.');
    } finally {
      stopTyping();
      setSending(false);
      if (shouldNavigate && chatId) {
        router.push(chatDashboardPath(chatId));
      }
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!userId || uploadingAttachment) return;
    setUploadingAttachment(true);

    let chatId = resolvedChatId;
    let threadTitle = active?.title ?? 'New chat';

    if (!chatId) {
      const created = await ensureThread();
      if (!created) {
        setUploadingAttachment(false);
        return;
      }
      chatId = created.chatId;
      threadTitle = created.title;
    }

    try {
      const form = new FormData();
      form.append('chatId', chatId);
      form.append('file', file);

      const res = await fetch('/api/chat/attachments', {
        method: 'POST',
        body: form,
      });

      if (res.status === 429) {
        setToast('Daily attachment limit reached (3/day).');
        return;
      }

      if (!res.ok) throw new Error('upload failed');

      const data = (await res.json()) as {
        attachment: { id: string; url: string; fileName: string };
      };

      setPendingAttachments((prev) => [
        ...prev,
        {
          id: data.attachment.id,
          url: data.attachment.url,
          fileName: data.attachment.fileName,
        },
      ]);
      if (threadTitle === 'New chat') {
        setThreads((prev) =>
          prev.map((t) =>
            t.chatId === chatId
              ? { ...t, title: file.name, updatedAt: new Date().toISOString() }
              : t
          )
        );
      }
    } catch {
      setToast('Attachment upload failed.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removePendingAttachment = async (attachment: PendingAttachment) => {
    setPendingAttachments((prev) =>
      prev.filter((item) => item.id !== attachment.id)
    );
    try {
      await fetch(
        `/api/chat/attachments/${encodeURIComponent(attachment.id)}`,
        { method: 'DELETE' }
      );
    } catch {
      setToast('Failed to remove attachment.');
    }
  };

  if (isLoaded && !isSignedIn) {
    return (
      <p className="p-8 text-sm text-slate-600">Sign in to use AI Chat.</p>
    );
  }

  return (
    <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:-m-8 md:flex-row">
      {toast ? (
        <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </p>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-900">
              Delete chat?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove "{stripMarkdownForDisplay(
                deleteTarget.title
              )}" and its messages.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteChat()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ResizableHistorySidebar
        storageKey="gamify:chat-sidebar-width"
        heading="Chat history"
        collapsible={false}
        isOpen
        onOpen={() => {}}
        onClose={() => {}}
        headerButton={
          <button
            type="button"
            onClick={() => void newChat()}
            disabled={!isSignedIn}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </button>
        }
      >
        {loadingList && threads.length === 0 ? (
          <p className="flex items-center justify-center gap-2 p-3 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </p>
        ) : threads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-500">
            No chats yet. Start a new chat.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <HistorySidebarRow
                key={t.chatId}
                id={t.chatId}
                title={t.title}
                isActive={urlChatId === t.chatId}
                isRenaming={renamingChatId === t.chatId}
                onSelect={() => navigateToChat(t.chatId)}
                onStartRename={() => setRenamingChatId(t.chatId)}
                onCommitRename={(next) => commitRenameChat(t.chatId, next)}
                onCancelRename={() => setRenamingChatId(null)}
                onShare={() => void shareChat(t.chatId)}
                onDelete={() => requestDeleteChat(t.chatId)}
              />
            ))}
          </ul>
        )}
      </ResizableHistorySidebar>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <h1 className="truncate text-sm font-semibold text-slate-900">
            {active?.title
              ? stripMarkdownForDisplay(active.title)
              : 'AI Chat'}
          </h1>
          {active?.chatId && messages.length > 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              ID: {active.chatId}
            </span>
          ) : null}
          {loadingMessages ? (
            <Loader2 className="ml-auto h-4 w-4 animate-spin text-slate-400" />
          ) : null}
        </header>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain p-4 md:p-6"
        >
          <div className="mx-auto flex w-[80%] max-w-none flex-col gap-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex w-full',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                    m.role === 'user'
                      ? 'max-w-[min(100%,34rem)] bg-blue-600 text-white'
                      : 'w-full border border-slate-200 bg-white text-slate-800'
                  )}
                >
                  {m.role === 'assistant' ? (
                    <>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        🤖
                      </p>
                      {m.id.startsWith('tmp-assistant-') &&
                      m.content.trim().length === 0 ? (
                        <div
                          className="flex items-center gap-1 text-slate-400"
                          aria-label="Bot is typing"
                        >
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                            style={{ animationDelay: '120ms' }}
                          />
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                            style={{ animationDelay: '240ms' }}
                          />
                        </div>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ children, href }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 hover:underline"
                              >
                                {children}
                              </a>
                            ),
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="ml-4 list-disc space-y-1">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="ml-4 list-decimal space-y-1">
                                {children}
                              </ol>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-slate-900">
                                {children}
                              </strong>
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      )}
                    </>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-100 underline"
                          >
                            {children}
                          </a>
                        ),
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="ml-4 list-disc space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="ml-4 list-decimal space-y-1">
                            {children}
                          </ol>
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white p-4 md:px-6">
          <form
            className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = '';
                if (file) void uploadAttachment(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAttachment || sending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              aria-label="Attach file"
              title="Attach file"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {pendingAttachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pendingAttachments.map((att) => (
                    <span
                      key={att.id}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                    >
                      {att.fileName}
                      <button
                        type="button"
                        onClick={() => void removePendingAttachment(att)}
                        className="text-slate-400 hover:text-slate-600"
                        aria-label={`Remove ${att.fileName}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask anything…"
                disabled={sending}
                className="max-h-32 min-h-[2.5rem] w-full resize-none border-0 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400 disabled:opacity-50"
                aria-label="Message"
              />
            </div>
            <button
              type="submit"
              disabled={(!input.trim() && pendingAttachments.length === 0) || sending || uploadingAttachment}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"
              aria-label="Send"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
