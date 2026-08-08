export default function ExportLoading() {
  return (
    <div className="space-y-6">
      {/* Options list */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-slate-100 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-48 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-24 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
