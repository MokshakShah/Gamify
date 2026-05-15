'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CollapsibleSidebarLayoutProps = {
  /** Visual shell around the sidebar (background, borders). */
  shellClassName: string;
  /** Extra classes on the layout root. */
  className?: string;
  /** Classes on the inner `<aside>`. */
  asideClassName?: string;
  sidebar: ReactNode;
  main: ReactNode;
  /**
   * Lock layout to the parent height (flex-1) and clip overflow so inner panes scroll.
   * Use on chat-style pages to avoid growing the document when messages stack.
   */
  fillViewport?: boolean;
};

export function CollapsibleSidebarLayout({
  shellClassName,
  asideClassName,
  className,
  sidebar,
  main,
  fillViewport = false,
}: CollapsibleSidebarLayoutProps) {
  const [open, setOpen] = useState(true);

  const close = useCallback(() => setOpen(false), []);
  const openSidebar = useCallback(() => setOpen(true), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <div
      className={cn(
        'relative flex flex-col md:flex-row md:items-stretch md:gap-0',
        fillViewport
          ? 'min-h-0 flex-1 overflow-hidden md:h-full'
          : 'flex min-h-0 flex-1 flex-col md:flex-row',
        className
      )}
    >
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close sidebar"
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-[1px] transition-[opacity,visibility] duration-300 ease-out md:hidden',
          open
            ? 'opacity-100'
            : 'pointer-events-none invisible opacity-0'
        )}
        onClick={close}
      />

      {/* Sidebar column */}
      <div
        className={cn(
          'relative z-[45] flex shrink-0 flex-col overflow-hidden',
          'transition-[width,transform,opacity,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          /* Mobile drawer: half width, full viewport height, flush to edges */
          'max-md:fixed max-md:left-0 max-md:top-0 max-md:h-[100dvh] max-md:w-1/2 max-md:min-w-[50vw] max-md:max-w-[50vw] max-md:rounded-none max-md:shadow-2xl',
          'md:h-full md:min-h-0 md:self-stretch',
          open
            ? 'max-md:translate-x-0 max-md:opacity-100'
            : 'max-md:pointer-events-none max-md:-translate-x-full max-md:opacity-0',
          open ? 'md:w-[clamp(17rem,28vw,22rem)] md:border-r md:border-slate-200' : 'md:w-0 md:border-r-0 md:shadow-none'
        )}
      >
        <div
          className={cn(
            'relative flex h-full w-full min-w-0 flex-col md:w-full',
            fillViewport ? 'min-h-0 md:min-h-0' : 'min-h-0',
            shellClassName
          )}
        >
          <button
            type="button"
            onClick={toggle}
            className={cn(
              'absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border text-slate-600 shadow-sm transition-[transform,background-color,box-shadow] duration-200 hover:scale-105 active:scale-95 md:right-4 md:top-4 md:h-9 md:w-9',
              'border-slate-200/90 bg-white/95 backdrop-blur hover:bg-white hover:shadow-md'
            )}
            aria-expanded={open}
            aria-controls="dashboard-side-panel"
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
          </button>

          <aside
            id="dashboard-side-panel"
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain',
              /* Mobile: compact “tiny” typography inside the drawer */
              'max-md:text-[10px] max-md:leading-snug max-md:[&_svg]:size-3',
              asideClassName
            )}
          >
            {sidebar}
          </aside>
        </div>
      </div>

      {/* Main */}
      <div
        className={cn(
          'relative min-w-0 flex-1 transition-[padding-left] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          fillViewport &&
            'flex min-h-0 flex-col overflow-hidden md:h-full md:min-h-0',
          !fillViewport && 'flex min-h-0 flex-col',
          !open && 'md:pl-12'
        )}
      >
        <button
          type="button"
          onClick={openSidebar}
          className={cn(
            'absolute left-3 top-3 z-[46] flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-md backdrop-blur transition-[opacity,transform,visibility] duration-300 ease-out hover:bg-white hover:shadow-lg active:scale-95 md:h-9 md:w-9',
            open
              ? 'pointer-events-none invisible scale-95 opacity-0'
              : 'opacity-100'
          )}
          aria-label="Open sidebar"
          aria-controls="dashboard-side-panel"
        >
          <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
        </button>
        {main}
      </div>
    </div>
  );
}
