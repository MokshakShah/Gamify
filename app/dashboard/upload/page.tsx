'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import {
  ArrowRight,
  Download,
  FileAudio,
  FileUp,
  Link2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { CollapsibleSidebarLayout } from '@/components/dashboard/CollapsibleSidebarLayout';
import { cn } from '@/lib/utils';

const meshBg =
  'relative bg-gradient-to-br from-[#f5f8ff] via-[#eef3ff] to-[#ebe8ff] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(780px_520px_at_12%_-8%,rgba(99,102,241,0.16),transparent_58%),radial-gradient(680px_440px_at_92%_8%,rgba(56,189,248,0.18),transparent_50%),radial-gradient(560px_380px_at_48%_102%,rgba(168,85,247,0.1),transparent_55%)]';

const DEMO_SUMMARY_BODY = `This is a placeholder summary. When you connect your AI pipeline, this panel will show the real condensed notes from your source.

- Key idea one — replace with model output.
- Key idea two — definitions, dates, or steps worth memorizing.
- Key idea three — suggested follow-up questions for chat or MCQ.

Use Deep dive to explore details in chat, or generate practice questions from this summary.`;

async function downloadSummaryPdf(title: string, body: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(11);
  const text = body.replace(/\r\n/g, '\n');
  const lines = doc.splitTextToSize(text, 182);
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

export default function UploadPage() {
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasSummary = Boolean(summaryText?.trim());

  const handleGenerate = useCallback(() => {
    setFormError(null);
    const url = urlRef.current?.value?.trim() ?? '';
    const file = fileRef.current?.files?.[0];
    if (!url && !file) {
      setFormError('Add a link or choose a file first.');
      return;
    }
    setGenerating(true);
    const sourceLine = url
      ? `Source (link): ${url}`
      : `Source (file): ${file!.name}`;
    window.setTimeout(() => {
      setSummaryText(`${sourceLine}\n\n${DEMO_SUMMARY_BODY}`);
      setGenerating(false);
    }, 600);
  }, []);

  const handleDownloadPdf = useCallback(() => {
    if (!summaryText?.trim()) return;
    void downloadSummaryPdf('Summary', summaryText);
  }, [summaryText]);

  return (
    <CollapsibleSidebarLayout
      className="-m-6 min-h-0 flex-1 md:-m-8"
      shellClassName="border-0 bg-gradient-to-b from-[#eef2ff] via-[#f4f7ff] to-[#eef4ff] max-md:border max-md:border-slate-200/60 md:border-r md:border-slate-200/40"
      main={
        <div
          className={cn(
            meshBg,
            'flex min-h-0 flex-1 flex-col gap-8 overflow-x-hidden p-6 md:flex-row md:items-stretch md:justify-between md:gap-10 md:p-8 lg:gap-12'
          )}
        >
          <div className="relative z-[1] flex w-full max-w-md shrink-0 flex-col gap-6 md:max-w-[19rem] md:pt-1 lg:max-w-sm">
            <header className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700 shadow-sm backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Learning hub
              </div>
              <h1 className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800 bg-clip-text text-2xl font-semibold tracking-tight text-transparent md:text-3xl">
                Upload anything
              </h1>
              <p className="text-sm leading-relaxed text-slate-600 md:text-[0.9375rem]">
                Drop a link or file — we&apos;ll turn it into a summary you can
                chat with, quiz from, and revisit anytime.
              </p>
            </header>

            <div className="flex flex-col gap-4">
              <label className="group block cursor-text">
                <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-[0_12px_40px_-24px_rgba(30,64,175,0.25)] backdrop-blur-md transition duration-300 hover:border-blue-200/80 hover:shadow-[0_18px_50px_-22px_rgba(37,99,235,0.35)]">
                  <div className="mb-3 flex items-center justify-center gap-2 text-center text-sm font-semibold text-slate-800">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                      <Link2 className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    Link
                  </div>
                  <input
                    ref={urlRef}
                    className="w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                    type="url"
                    placeholder="https://youtube.com/… or article URL"
                    aria-label="Paste link"
                  />
                </div>
              </label>

              <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                or
              </p>

              <label className="group block cursor-pointer">
                <div className="rounded-2xl border border-dashed border-blue-200/70 bg-gradient-to-br from-white/80 to-blue-50/40 px-4 py-7 text-center shadow-[0_12px_40px_-26px_rgba(79,70,229,0.2)] backdrop-blur-md transition duration-300 hover:border-cyan-300/80 hover:from-white hover:to-cyan-50/50 hover:shadow-[0_18px_48px_-24px_rgba(14,165,233,0.25)]">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
                    <FileUp className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    PDF or audio…
                  </span>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Tap to browse — PDF, MP3, WAV, or video
                  </p>
                  <input
                    ref={fileRef}
                    className="sr-only"
                    type="file"
                    accept=".pdf,audio/*,video/*"
                  />
                </div>
              </label>

              {formError ? (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              ) : null}

              <button
                type="button"
                disabled={generating}
                onClick={handleGenerate}
                className={cn(
                  'inline-flex items-center justify-center gap-2 self-start rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_40px_-12px_rgba(37,99,235,0.55)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70',
                  'bg-gradient-to-r from-[#2563eb] via-[#4f46e5] to-[#7c3aed]'
                )}
              >
                <Wand2 className="h-4 w-4 opacity-90" />
                {generating ? 'Generating…' : 'Generate summary'}
              </button>
            </div>
          </div>

          <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
            <div className="flex min-h-[min(440px,56vh)] w-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-[0_20px_60px_-28px_rgba(30,27,75,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 bg-gradient-to-r from-white/90 via-blue-50/50 to-indigo-50/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Output
                </p>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                  <h2 className="truncate text-sm font-semibold tracking-wide text-slate-900">
                    Summary
                  </h2>
                  {hasSummary ? (
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-white hover:text-blue-800"
                      aria-label="Download summary as PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  ) : null}
                </div>
              </div>
              <div
                className={cn(
                  'flex flex-1 flex-col gap-4 p-6 md:p-8',
                  hasSummary
                    ? 'items-stretch text-left'
                    : 'items-center justify-center text-center'
                )}
              >
                {hasSummary ? (
                  <p className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {summaryText}
                  </p>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 shadow-inner ring-1 ring-white/80">
                      <FileAudio className="h-7 w-7 opacity-80" />
                    </div>
                    <div className="max-w-sm space-y-2">
                      <p className="text-sm font-medium text-slate-800">
                        Ready when you are
                      </p>
                      <p className="text-sm leading-relaxed text-slate-600">
                        Add a source on the left, then generate. Your summary
                        lands here with next steps just below.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {hasSummary ? (
              <nav className="mt-4 flex w-full flex-col items-end gap-2.5 text-sm">
                <Link
                  href="/dashboard/chat"
                  className="group inline-flex items-center gap-1.5 font-semibold text-blue-700 transition hover:text-indigo-700"
                >
                  Deep dive
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/dashboard/mcq"
                  className="group inline-flex items-center gap-1.5 text-right font-semibold text-blue-700 transition hover:text-indigo-700"
                >
                  Generate MCQ from the summary
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              </nav>
            ) : null}
          </div>
        </div>
      }
      sidebar={
        <div className="relative z-[1] flex h-full min-h-0 flex-col gap-4 px-4 pb-8 pt-14 md:gap-5 md:px-5 md:pb-10 md:pt-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 md:text-xs">
              Why upload first
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 md:text-base">
              Everything starts here
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {[
              {
                title: 'One source, many modes',
                body: 'Summaries power chat, flashcards, and quizzes in one flow.',
                icon: Sparkles,
              },
              {
                title: 'Links or files',
                body: 'YouTube, articles, PDFs, or lecture audio — same pipeline.',
                icon: Link2,
              },
              {
                title: 'Stay organized',
                body: 'Keep materials in one place so review sessions stay focused.',
                icon: FileUp,
              },
            ].map(({ title, body, icon: Icon }) => (
              <li
                key={title}
                className="rounded-xl border border-white/60 bg-white/55 p-3 shadow-sm backdrop-blur-sm md:p-3.5"
              >
                <div className="flex gap-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md">
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 md:text-sm">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-600 md:text-xs">
                      {body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-auto rounded-xl border border-dashed border-indigo-200/70 bg-indigo-50/40 px-3 py-4 text-center text-[11px] leading-relaxed text-indigo-900/80 md:text-xs">
            Tip: paste a playlist or syllabus PDF — we&apos;ll chunk it for
            smarter follow-ups.
          </div>
        </div>
      }
    />
  );
}
