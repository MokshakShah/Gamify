'use client';

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  prepareSummaryForDisplay,
  stripLeadingTopicHeading,
  stripMarkdownForDisplay,
} from '@/lib/summary/summary-markdown';

type SummaryMarkdownProps = {
  markdown: string;
  /** When false, keeps the leading # topic in the body (default: strip — topic shown in page header). */
  showTopicHeading?: boolean;
  className?: string;
};

/** Renders **bold** as <strong> without showing raw asterisks. */
export function renderInlineEmphasis(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {bold[1]}
        </strong>
      );
    }
    return part;
  });
}

export function SummaryMarkdown({
  markdown,
  showTopicHeading = false,
  className,
}: SummaryMarkdownProps) {
  const body = showTopicHeading
    ? markdown
    : stripLeadingTopicHeading(markdown);
  const processed = prepareSummaryForDisplay(body);

  return (
    <div
      className={
        className ??
        'summary-markdown prose prose-sm max-w-none text-slate-700 prose-headings:text-slate-900 prose-h2:mt-6 prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-2 prose-h2:text-base prose-h2:font-bold prose-h3:text-sm prose-h3:font-semibold prose-p:leading-relaxed prose-strong:font-bold prose-strong:text-slate-900'
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            if (href === 'gamify-highlight:') {
              return (
                <mark className="rounded-md bg-amber-200/90 px-1.5 py-0.5 font-bold text-amber-950 ring-1 ring-amber-300">
                  {children}
                </mark>
              );
            }
            return (
              <a
                href={href}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
          h1: ({ children }) => (
            <h2 className="text-lg font-bold text-slate-900">{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 border-b border-slate-200 pb-2 text-base font-bold text-slate-900">
              {children}
            </h2>
          ),
          p: ({ children }) => {
            if (typeof children === 'string') {
              return (
                <p className="leading-relaxed">
                  {renderInlineEmphasis(children)}
                </p>
              );
            }
            return <p className="leading-relaxed">{children}</p>;
          },
          ul: ({ children }) => (
            <ul className="my-3 list-none space-y-2.5 pl-0">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex gap-2.5 leading-relaxed">
              <span
                className="mt-0.5 shrink-0 text-base font-bold text-slate-900"
                aria-hidden
              >
                •
              </span>
              <span className="min-w-0 flex-1">{children}</span>
            </li>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-none space-y-2.5 pl-0">{children}</ol>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">{children}</strong>
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

/** Topic line for the summary panel header — never shows raw ** markers. */
export function SummaryTopicHeading({
  markdown,
  fallbackTitle,
}: {
  markdown: string;
  fallbackTitle: string;
}) {
  const match = markdown.match(/^#\s+(.+)$/m);
  const raw = match?.[1]?.trim() ?? fallbackTitle;
  const topic = stripMarkdownForDisplay(raw);

  return (
    <h3 className="text-xl font-bold tracking-tight text-slate-900">
      {renderInlineEmphasis(topic)}
    </h3>
  );
}
