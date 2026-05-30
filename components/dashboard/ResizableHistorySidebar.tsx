'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, PanelLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_WIDTH = 208;
const MIN_WIDTH = 160;
const MAX_WIDTH = 360;

function readWidth(storageKey: string): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  try {
    const n = parseInt(localStorage.getItem(storageKey) ?? '', 10);
    if (Number.isFinite(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
  } catch {
    /* ignore */
  }
  return DEFAULT_WIDTH;
}

type ResizableHistorySidebarProps = {
  storageKey: string;
  heading: string;
  description?: string;
  /** When false, sidebar stays visible (chat page). Default true (upload). */
  collapsible?: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  headerButton: React.ReactNode;
  children: React.ReactNode;
};

export function ResizableHistorySidebar({
  storageKey,
  heading,
  description,
  collapsible = true,
  isOpen,
  onOpen,
  onClose,
  headerButton,
  children,
}: ResizableHistorySidebarProps) {
  const visible = collapsible ? isOpen : true;
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    setWidth(readWidth(storageKey));
  }, [storageKey]);

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      if (window.matchMedia('(max-width: 767px)').matches) return;
      e.preventDefault();
      dragging.current = true;
      setIsResizing(true);
      const startX = e.clientX;
      const startW = width;

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const next = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, startW + (ev.clientX - startX))
        );
        setWidth(next);
      };

      const onUp = () => {
        dragging.current = false;
        setIsResizing(false);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        setWidth((w) => {
          try {
            localStorage.setItem(storageKey, String(w));
          } catch {
            /* ignore */
          }
          return w;
        });
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [storageKey, width]
  );

  return (
    <>
      <div
        className={cn(
          'relative shrink-0 overflow-hidden border-slate-200 md:border-r',
          visible
            ? 'w-full border-b md:w-[var(--sidebar-w)] md:max-w-[var(--sidebar-w)] md:border-b-0'
            : 'w-0 border-transparent',
          !isResizing && 'transition-[width] duration-300 ease-in-out'
        )}
        style={
          visible
            ? ({
                ['--sidebar-w' as string]: `${width}px`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <aside className="relative flex h-full w-full min-w-0 flex-col bg-white">
          <div
            className={cn(
              'relative shrink-0 border-b border-slate-100 px-3 py-3',
              collapsible && 'pr-10'
            )}
          >
            {collapsible ? (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close sidebar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {heading}
            </p>
            {description ? (
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                {description}
              </p>
            ) : null}
            <div className="mt-2">{headerButton}</div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
            {children}
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            onPointerDown={onResizeStart}
            className="absolute -right-1 top-0 z-10 hidden h-full w-3 cursor-col-resize touch-none hover:bg-blue-500/10 md:block"
          >
            <div className="pointer-events-none absolute inset-y-4 right-0 w-px bg-slate-200" />
            <GripVertical className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </aside>
      </div>

      {collapsible ? (
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            'shrink-0 overflow-hidden border-r border-slate-200 bg-white text-slate-600 transition-all duration-300 ease-in-out hover:bg-slate-50',
            visible
              ? 'pointer-events-none w-0 border-transparent opacity-0'
              : 'flex w-10 flex-col items-center justify-center gap-1 py-6 opacity-100 md:w-11'
          )}
          aria-label={`Open ${heading.toLowerCase()}`}
          title={heading}
          tabIndex={visible ? -1 : 0}
        >
          <PanelLeft className="h-4 w-4 shrink-0" />
          <span className="hidden text-[9px] font-semibold uppercase tracking-wide [writing-mode:vertical-rl] md:inline">
            History
          </span>
        </button>
      ) : null}

      {collapsible && !visible ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 md:hidden"
        >
          <PanelLeft className="h-3.5 w-3.5" />
          Show {heading.toLowerCase()}
        </button>
      ) : null}
    </>
  );
}
