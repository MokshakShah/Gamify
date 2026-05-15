'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Plus,
  SendHorizontal,
  Sparkles,
} from 'lucide-react';
import { CollapsibleSidebarLayout } from '@/components/dashboard/CollapsibleSidebarLayout';
import { cn } from '@/lib/utils';

type Role = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}

const SUGGESTIONS = [
  'Summarize my last upload in 3 bullets',
  'What are the key terms I should remember?',
  'Quiz me on the main ideas',
];

const WELCOME_ASSISTANT =
  "Hi — I'm here to help you learn from your materials. Ask anything about your uploads, or pick a suggestion below.";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_ASSISTANT,
    },
  ]);
  const [input, setInput] = useState('');
  const [attachHint, setAttachHint] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  function send(text?: string) {
    const trimmed = (text ?? input).trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    const reply: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'This is a preview UI — wire your model API here. I would answer based on your uploaded summary and sources.',
    };
    setTimeout(() => setMessages((prev) => [...prev, reply]), 450);
  }

  return (
    <CollapsibleSidebarLayout
      fillViewport
      className="min-h-0 flex-1 -m-6 md:-m-8"
      shellClassName="bg-white max-md:border max-md:border-slate-200 md:border-0"
      main={
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 text-center text-xs text-slate-600">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="font-medium text-slate-700">
                Answers use your uploads when you connect a backend.
              </span>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-6 md:px-10 md:py-8"
            >
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
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
                        'max-w-[min(100%,34rem)] rounded-[1.35rem] px-4 py-3 text-[0.9375rem] leading-relaxed shadow-sm',
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-[#1a73e8] to-[#4b39ef] text-white shadow-[0_12px_40px_-18px_rgba(26,115,232,0.65)]'
                          : 'border border-white/70 bg-white/85 text-slate-800 shadow-[0_8px_32px_-20px_rgba(15,23,42,0.25)] backdrop-blur-md'
                      )}
                    >
                      {m.role === 'assistant' ? (
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-cyan-400 to-violet-500 text-white shadow-inner">
                            <Sparkles className="h-3 w-3" />
                          </span>
                          Assistant
                        </div>
                      ) : null}
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {messages.length <= 1 ? (
              <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-wrap justify-center gap-2 px-4 pb-2 pt-1 md:px-10">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="relative shrink-0 border-t border-slate-200 bg-slate-50 p-4 pb-5 md:px-10">
              <form
                className="mx-auto flex w-full max-w-3xl flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <div className="relative flex flex-1 items-end rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
                  <label
                    htmlFor="chat-attachment-upload"
                    className="mb-2.5 ml-2 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span className="sr-only">
                      Upload PDF, image, or other file
                    </span>
                    <Plus className="h-5 w-5" strokeWidth={2.25} />
                  </label>
                  <input
                    id="chat-attachment-upload"
                    type="file"
                    className="sr-only"
                    accept="image/*,.pdf,application/pdf"
                    multiple
                    onChange={(e) => {
                      const { files } = e.target;
                      if (files?.length) {
                        const names = Array.from(files)
                          .map((f) => f.name)
                          .slice(0, 3)
                          .join(', ');
                        const extra =
                          files.length > 3 ? ` +${files.length - 3} more` : '';
                        setAttachHint(
                          `${files.length} file${files.length > 1 ? 's' : ''}: ${names}${extra} — wire your upload API to attach.`
                        );
                      } else {
                        setAttachHint(null);
                      }
                      e.target.value = '';
                    }}
                  />
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Ask anything…"
                    className="max-h-40 min-h-[3.25rem] w-full resize-none bg-transparent px-2 py-3.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none md:text-[0.9375rem]"
                    aria-label="Message"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={cn(
                      'mb-2 mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition',
                      'bg-gradient-to-br from-[#1a73e8] via-[#3b82f6] to-[#7c3aed] shadow-lg shadow-blue-500/25',
                      'hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none'
                    )}
                    aria-label="Send"
                  >
                    <SendHorizontal className="h-5 w-5" />
                  </button>
                </div>
                {attachHint ? (
                  <p className="px-1 text-center text-[11px] text-slate-600">
                    {attachHint}
                  </p>
                ) : null}
              </form>
              <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-slate-500">
                Gamify can make mistakes. Double-check important facts.
              </p>
            </div>
          </div>
        </div>
      }
      sidebar={
        <div className="flex h-full min-h-0 flex-col gap-2 px-2.5 pb-4 pt-11 md:gap-4 md:px-4 md:pb-6 md:pt-16">
          <button
            type="button"
            className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 py-1.5 text-[10px] font-semibold text-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_24px_-12px_rgba(66,133,244,0.45)] backdrop-blur transition hover:border-blue-200/80 hover:shadow-[0_8px_28px_-10px_rgba(66,133,244,0.55)] md:gap-2 md:py-3 md:text-sm md:font-medium"
            onClick={() => {
              setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: WELCOME_ASSISTANT,
                },
              ]);
              setInput('');
              setAttachHint(null);
            }}
          >
            <Plus className="h-3 w-3 shrink-0 text-blue-600 md:h-4 md:w-4" strokeWidth={2.25} />
            New chat
          </button>

          <div className="flex min-h-0 flex-1 flex-col">
            <p className="shrink-0 px-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 md:px-1 md:text-xs">
              Recent
            </p>
            <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-y-contain md:mt-2 md:gap-1">
              <button
                type="button"
                className="flex w-full shrink-0 items-start gap-1.5 rounded-lg px-2 py-1.5 text-left text-[10px] font-medium leading-snug text-slate-700 transition hover:bg-white/70 md:gap-2 md:rounded-2xl md:px-3 md:py-2.5 md:text-sm"
              >
                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-blue-500/90 md:h-4 md:w-4" />
                <span className="line-clamp-3 md:line-clamp-2">
                  Course prep · acids & bases
                </span>
              </button>
              <button
                type="button"
                className="flex w-full shrink-0 items-start gap-1.5 rounded-lg px-2 py-1.5 text-left text-[10px] leading-snug text-slate-600 transition hover:bg-white/60 md:gap-2 md:rounded-2xl md:px-3 md:py-2.5 md:text-sm"
              >
                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-slate-400 md:h-4 md:w-4" />
                <span className="line-clamp-3 md:line-clamp-2">
                  Lecture 4 summary follow-up
                </span>
              </button>
              <div className="shrink-0 rounded-lg border border-dashed border-slate-300/80 bg-white/40 px-2 py-4 text-center text-[9px] text-slate-500 md:rounded-2xl md:px-3 md:py-8 md:text-xs">
                Older threads will list here.
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}
