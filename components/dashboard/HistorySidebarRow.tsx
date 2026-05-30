'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatThreadMenu } from '@/components/dashboard/ChatThreadMenu';
import { stripMarkdownForDisplay } from '@/lib/summary/markdown-display';
import { cn } from '@/lib/utils';

type HistorySidebarRowProps = {
  id: string;
  title: string;
  subtitle?: string;
  isActive: boolean;
  isRenaming: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (nextTitle: string) => void | Promise<void>;
  onCancelRename: () => void;
  onShare: () => void;
  onDelete: () => void;
};

export function HistorySidebarRow({
  id,
  title,
  subtitle,
  isActive,
  isRenaming,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onShare,
  onDelete,
}: HistorySidebarRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const [draft, setDraft] = useState(() => stripMarkdownForDisplay(title));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isRenaming) {
      setDraft(stripMarkdownForDisplay(title));
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isRenaming, title]);

  const commit = async () => {
    const next = draft.trim();
    if (!next || next === stripMarkdownForDisplay(title)) {
      onCancelRename();
      return;
    }
    setSaving(true);
    try {
      await onCommitRename(next);
    } finally {
      setSaving(false);
    }
  };

  if (isRenaming) {
    return (
      <li>
        <div
          className={cn(
            'rounded-lg border border-blue-200 bg-blue-50/80 p-2 ring-1 ring-blue-200',
            isActive && 'bg-blue-50'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void commit();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelRef.current = true;
                onCancelRename();
              }
            }}
            onBlur={() => {
              window.setTimeout(() => {
                if (!cancelRef.current) void commit();
                cancelRef.current = false;
              }, 120);
            }}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 outline-none ring-2 ring-blue-500/40"
            aria-label="Rename"
          />
          <p className="mt-1.5 text-[10px] text-slate-500">
            Enter to save · Esc to cancel
          </p>
        </div>
      </li>
    );
  }

  const displayTitle = stripMarkdownForDisplay(title);

  return (
    <li>
      <div
        className={cn(
          'group flex items-stretch rounded-lg transition',
          isActive ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-start gap-1.5 px-2 py-1.5 text-left"
        >
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1 overflow-hidden">
            <span
              className="block truncate text-xs font-medium leading-snug text-slate-800"
              title={displayTitle}
            >
              {displayTitle}
            </span>
            {subtitle ? (
              <span
                className="mt-0.5 block truncate text-[10px] text-slate-500"
                title={subtitle}
              >
                {subtitle}
              </span>
            ) : null}
          </span>
        </button>
        <ChatThreadMenu
          chatId={id}
          title={displayTitle}
          onRename={onStartRename}
          onShare={onShare}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
}
