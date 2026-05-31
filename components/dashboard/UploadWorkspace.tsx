'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Download,
  Link2,
  Loader2,
  Wand2,
} from 'lucide-react';
import { HistorySidebarRow } from '@/components/dashboard/HistorySidebarRow';
import { ResizableHistorySidebar } from '@/components/dashboard/ResizableHistorySidebar';
import {
  SummaryMarkdown,
  SummaryTopicHeading,
} from '@/components/dashboard/SummaryMarkdown';
import {
  readUploadCache,
  removeUploadFromCache,
  replaceUploadMetaInCache,
  setUploadDetailInCache,
  updateUploadTitleInCache,
  type CachedUploadDetail,
  type CachedUploadMeta,
} from '@/lib/upload/client-cache';
import { uploadDashboardPath, uploadShareUrl } from '@/lib/upload/urls';
import {
  extractSummaryTopic,
  stripMarkdownForDisplay,
  summaryToPlainText,
} from '@/lib/summary/summary-markdown';
import { cleanYoutubeTitle } from '@/lib/youtube/clean-title';
import { cn } from '@/lib/utils';
import { writeDeepDiveContext } from '@/lib/chat/deep-dive-context';
import { chatDashboardPath } from '@/lib/chat/urls';

export type YoutubeSummaryMeta = {
  id: string;
  videoId: string;
  sourceUrl: string;
  title: string;
  channelName: string;
  status: string;
  createdAt: string;
};

export type YoutubeSummaryItem = YoutubeSummaryMeta & {
  summary: string | null;
  errorMessage: string | null;
};

type UploadWorkspaceProps = {
  /** When set, viewing a saved summary at /dashboard/upload/[summaryId]. */
  urlSummaryId?: string;
};

function historyTopicLabel(item: {
  title: string;
  summary?: string | null;
}): string {
  const fromSummary = item.summary?.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const raw = fromSummary ?? cleanYoutubeTitle(item.title);
  return stripMarkdownForDisplay(raw);
}

function formatSummaryDisplay(item: YoutubeSummaryItem): string {
  const topic =
    item.summary?.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
    cleanYoutubeTitle(item.title);
  const header = `${topic}${item.channelName ? ` · ${item.channelName}` : ''}\n${item.sourceUrl}\n\n`;
  const body = item.summary ? summaryToPlainText(item.summary) : '';
  return header + body;
}

function metaToCached(m: YoutubeSummaryMeta): CachedUploadMeta {
  return {
    id: m.id,
    videoId: m.videoId,
    sourceUrl: m.sourceUrl,
    title: m.title,
    channelName: m.channelName,
    status: m.status,
    createdAt: m.createdAt,
  };
}

function detailToItem(d: CachedUploadDetail): YoutubeSummaryItem {
  return {
    id: d.id,
    videoId: d.videoId,
    sourceUrl: d.sourceUrl,
    title: d.title,
    channelName: d.channelName,
    status: d.status,
    createdAt: d.createdAt,
    summary: d.summary,
    errorMessage: d.errorMessage,
  };
}

async function downloadSummaryPdf(title: string, body: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.text(title.slice(0, 80), 14, 18);
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(body.replace(/\r\n/g, '\n'), 182);
  let y = 28;
  const lineHeight = 6;
  const pageBottom = 287;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (y + lineHeight > pageBottom) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 14, y);
    y += lineHeight;
  }
  doc.save('gamify-summary.pdf');
}

export function UploadWorkspace({ urlSummaryId }: UploadWorkspaceProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [history, setHistory] = useState<YoutubeSummaryMeta[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<YoutubeSummaryItem | null>(
    null
  );
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pastUploadsOpen, setPastUploadsOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [renamingSummaryId, setRenamingSummaryId] = useState<string | null>(
    null
  );
  const urlRef = useRef<HTMLInputElement>(null);
  const listLoadedRef = useRef(false);

  const viewingHistory = Boolean(urlSummaryId);
  const hasSummary = Boolean(selectedDetail?.summary?.trim());

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const loadDetail = useCallback(
    async (uid: string, summaryId: string, useCache = true) => {
      if (useCache) {
        const cached = readUploadCache(uid)?.detailsById[summaryId];
        if (cached?.summary) {
          setSelectedDetail(detailToItem(cached));
        }
      }

      setLoadingDetail(true);
      try {
        const res = await fetch(
          `/api/upload/youtube/${encodeURIComponent(summaryId)}`
        );
        if (res.status === 404) {
          router.replace('/dashboard/upload');
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { item: YoutubeSummaryItem };
        setSelectedDetail(data.item);
        setUploadDetailInCache(uid, {
          id: data.item.id,
          videoId: data.item.videoId,
          sourceUrl: data.item.sourceUrl,
          title: data.item.title,
          channelName: data.item.channelName,
          status: data.item.status,
          createdAt: data.item.createdAt,
          summary: data.item.summary,
          errorMessage: data.item.errorMessage,
        });
      } finally {
        setLoadingDetail(false);
      }
    },
    [router]
  );

  const refreshHistory = useCallback(async (uid: string) => {
    const res = await fetch('/api/upload/youtube');
    if (!res.ok) return;
    const data = (await res.json()) as { items: YoutubeSummaryMeta[] };
    setHistory(data.items);
    replaceUploadMetaInCache(uid, data.items.map(metaToCached));
    return data.items;
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      if (isLoaded && !isSignedIn) setLoadingHistory(false);
      return;
    }

    if (listLoadedRef.current) return;

    let cancelled = false;

    const boot = async () => {
      const cache = readUploadCache(userId);
      if (cache?.items.length) setHistory(cache.items);

      setLoadingHistory(true);
      try {
        const list = await refreshHistory(userId);
        if (cancelled) return;

        if (urlSummaryId) {
          const exists = list?.some((i) => i.id === urlSummaryId);
          if (!exists) {
            router.replace('/dashboard/upload');
            return;
          }
          await loadDetail(userId, urlSummaryId, true);
        } else {
          setSelectedDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
          listLoadedRef.current = true;
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isSignedIn,
    userId,
    urlSummaryId,
    router,
    refreshHistory,
    loadDetail,
  ]);

  useEffect(() => {
    listLoadedRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (!userId || !urlSummaryId || !listLoadedRef.current) return;
    void loadDetail(userId, urlSummaryId, true);
  }, [userId, urlSummaryId, loadDetail]);

  const navigateToSummary = (id: string) => {
    router.push(uploadDashboardPath(id));
    setFormError(null);
    if (urlRef.current) urlRef.current.value = '';
  };

  const startNew = () => {
    setSelectedDetail(null);
    setFormError(null);
    setStatusLine(null);
    if (urlRef.current) urlRef.current.value = '';
    router.push('/dashboard/upload');
  };

  const handleGenerate = async () => {
    setFormError(null);
    setStatusLine(null);
    const url = urlRef.current?.value?.trim() ?? '';
    if (!url) {
      setFormError('Paste a YouTube link first.');
      return;
    }
    if (!userId) return;

    setGenerating(true);
    setStatusLine('Validating URL…');

    try {
      setStatusLine('Fetching transcript & analyzing video…');
      const res = await fetch('/api/upload/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = (await res.json()) as {
        error?: string;
        item?: YoutubeSummaryItem;
        cached?: boolean;
      };

      if (!res.ok) {
        setFormError(
          data.error ?? 'Could not generate a summary for this video.'
        );
        if (data.item?.status === 'completed' && data.item.summary) {
          setUploadDetailInCache(userId, {
            ...metaToCached(data.item),
            summary: data.item.summary,
            errorMessage: data.item.errorMessage,
          });
          void refreshHistory(userId);
          router.push(uploadDashboardPath(data.item.id));
        }
        return;
      }

      if (data.item) {
        setUploadDetailInCache(userId, {
          ...metaToCached(data.item),
          summary: data.item.summary,
          errorMessage: data.item.errorMessage,
        });
        await refreshHistory(userId);
        setStatusLine(
          data.cached ? 'Loaded saved summary.' : 'Summary ready.'
        );
        if (urlRef.current) urlRef.current.value = '';
        router.push(uploadDashboardPath(data.item.id));
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setGenerating(false);
      window.setTimeout(() => setStatusLine(null), 3000);
    }
  };

  const deleteUpload = async (summaryId: string) => {
    if (!userId) return;
    if (!window.confirm('Delete this summary permanently?')) return;

    removeUploadFromCache(userId, summaryId);
    const next = history.filter((i) => i.id !== summaryId);
    setHistory(next);

    if (summaryId === urlSummaryId) {
      const fallback = next[0]?.id;
      router.push(fallback ? uploadDashboardPath(fallback) : '/dashboard/upload');
    }

    try {
      await fetch(`/api/upload/youtube/${encodeURIComponent(summaryId)}`, {
        method: 'DELETE',
      });
    } catch {
      void refreshHistory(userId);
    }
  };

  const commitRenameUpload = async (summaryId: string, nextTitle: string) => {
    if (!userId) return;

    setHistory((prev) =>
      prev.map((i) => (i.id === summaryId ? { ...i, title: nextTitle } : i))
    );
    if (selectedDetail?.id === summaryId) {
      setSelectedDetail({ ...selectedDetail, title: nextTitle });
    }
    updateUploadTitleInCache(userId, summaryId, nextTitle);
    setRenamingSummaryId(null);

    try {
      await fetch(`/api/upload/youtube/${encodeURIComponent(summaryId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nextTitle }),
      });
    } catch {
      /* ignore */
    }
  };

  const shareUpload = async (summaryId: string) => {
    try {
      await navigator.clipboard.writeText(uploadShareUrl(summaryId));
      setToast('Link copied to clipboard');
    } catch {
      setToast(uploadShareUrl(summaryId));
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedDetail?.summary) return;
    void downloadSummaryPdf(
      selectedDetail.title,
      formatSummaryDisplay(selectedDetail)
    );
  };

  const startDeepDive = async () => {
    if (!userId || !selectedDetail?.summary) return;
    try {
      const res = await fetch('/api/chat/threads', { method: 'POST' });
      if (!res.ok) throw new Error('chat create failed');
      const data = (await res.json()) as { thread: { chatId: string } };
      const chatId = data.thread.chatId;
      writeDeepDiveContext(userId, chatId, {
        summaryId: selectedDetail.id,
        topic: extractSummaryTopic(
          selectedDetail.summary,
          cleanYoutubeTitle(selectedDetail.title)
        ),
        title: selectedDetail.title,
        channelName: selectedDetail.channelName,
        sourceUrl: selectedDetail.sourceUrl,
        summary: summaryToPlainText(selectedDetail.summary),
      });
      router.push(chatDashboardPath(chatId));
    } catch {
      setToast('Could not start deep dive. Please try again.');
    }
  };

  if (isLoaded && !isSignedIn) {
    return (
      <p className="p-8 text-sm text-slate-600">Sign in to use Upload.</p>
    );
  }

  return (
    <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:-m-8 md:flex-row">
      {toast ? (
        <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </p>
      ) : null}

      <ResizableHistorySidebar
        storageKey="gamify:upload-sidebar-width"
        heading="Past uploads"
        description="YouTube summaries saved to your account."
        isOpen={pastUploadsOpen}
        onOpen={() => setPastUploadsOpen(true)}
        onClose={() => setPastUploadsOpen(false)}
        headerButton={
          <button
            type="button"
            onClick={startNew}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            New upload
          </button>
        }
      >
        {loadingHistory ? (
          <p className="flex items-center justify-center gap-2 p-3 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </p>
        ) : history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-500">
            No saved items yet.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {history.map((item) => {
              const cachedSummary =
                userId && readUploadCache(userId)?.detailsById[item.id]?.summary;
              const rowTitle = cachedSummary
                ? historyTopicLabel({
                    title: item.title,
                    summary: cachedSummary,
                  })
                : stripMarkdownForDisplay(item.title);

              return (
                <HistorySidebarRow
                  key={item.id}
                  id={item.id}
                  title={rowTitle}
                  subtitle={item.channelName || undefined}
                  isActive={urlSummaryId === item.id}
                  isRenaming={renamingSummaryId === item.id}
                  onSelect={() => navigateToSummary(item.id)}
                  onStartRename={() => setRenamingSummaryId(item.id)}
                  onCommitRename={(next) => commitRenameUpload(item.id, next)}
                  onCancelRename={() => setRenamingSummaryId(null)}
                  onShare={() => void shareUpload(item.id)}
                  onDelete={() => void deleteUpload(item.id)}
                />
              );
            })}
          </ul>
        )}
      </ResizableHistorySidebar>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 lg:flex-row">
        {!viewingHistory ? (
          <section className="shrink-0 border-b border-slate-200 bg-white p-6 lg:w-[min(100%,22rem)] lg:border-b-0 lg:border-r">
            <h2 className="text-lg font-semibold text-slate-900">Upload</h2>
            <p className="mt-1 text-sm text-slate-600">
              Paste a YouTube link. We validate the URL, fetch captions, then
              summarize with AI. No transcript → no summary.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  YouTube link
                </span>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/25">
                  <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    ref={urlRef}
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=…"
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:text-slate-500"
                    aria-label="Paste YouTube link"
                    disabled={generating}
                  />
                </div>
              </label>

              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                PDF and audio uploads are coming later. Only YouTube URLs are
                supported right now.
              </p>

              {formError ? (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              ) : null}

              {statusLine ? (
                <p className="text-sm text-blue-700">{statusLine}</p>
              ) : null}

              <button
                type="button"
                disabled={generating}
                onClick={() => void handleGenerate()}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition',
                  'bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {generating ? 'Working…' : 'Generate summary'}
              </button>
            </div>
          </section>
        ) : null}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
              <p className="text-sm text-slate-600">
                {selectedDetail && hasSummary
                  ? 'Formatted study notes'
                  : viewingHistory
                    ? selectedDetail?.channelName || 'Saved summary'
                    : 'Generate a summary to see it here'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loadingDetail ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : null}
              {hasSummary ? (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  aria-label="Download summary as PDF"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </button>
              ) : (
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Pending
                </span>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {hasSummary && selectedDetail?.summary ? (
              <article>
                <SummaryTopicHeading
                  markdown={selectedDetail.summary}
                  fallbackTitle={cleanYoutubeTitle(selectedDetail.title)}
                />
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  {selectedDetail.channelName ? (
                    <span className="font-medium text-slate-600">
                      {selectedDetail.channelName}
                    </span>
                  ) : null}
                  <a
                    href={selectedDetail.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Watch on YouTube
                  </a>
                </div>
                <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/50 p-5">
                  <SummaryMarkdown markdown={selectedDetail.summary} />
                </div>
              </article>
            ) : (
              <p className="text-sm text-slate-500">
                {viewingHistory
                  ? 'Loading summary…'
                  : 'Summary will appear here after a video with captions is processed.'}
              </p>
            )}
          </div>

          {hasSummary ? (
            <nav className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => void startDeepDive()}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-indigo-700"
              >
                Deep dive
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/dashboard/mcq"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-indigo-700"
              >
                Generate MCQ from summary
                <ArrowRight className="h-4 w-4" />
              </Link>
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
