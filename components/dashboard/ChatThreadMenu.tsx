'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChatThreadMenuProps = {
  chatId: string;
  title: string;
  /** Start inline rename in the sidebar (no browser prompt). */
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
};

export function ChatThreadMenu({
  chatId,
  title,
  onRename,
  onShare,
  onDelete,
}: ChatThreadMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-800',
          open && 'bg-slate-200/80 text-slate-800'
        )}
        aria-label={`Options for ${title}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[8.5rem] rounded-lg border border-slate-200 bg-white py-0.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onRename();
            }}
          >
            <Pencil className="h-4 w-4 text-slate-400" />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onShare();
            }}
          >
            <Share2 className="h-4 w-4 text-slate-400" />
            Share
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
