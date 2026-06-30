import type { ReactNode } from 'react';

interface PanelShellProps {
  title: string;
  description?: string;
  children?: ReactNode;
  /** When true, children render without the inner bordered card wrapper. */
  unboxed?: boolean;
}

export function PanelShell({
  title,
  description,
  children,
  unboxed = false,
}: PanelShellProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description ? (
          <p className="text-sm text-slate-600">{description}</p>
        ) : null}
      </header>
      {unboxed ? (
        children
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      )}
    </section>
  );
}
