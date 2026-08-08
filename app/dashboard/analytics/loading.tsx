export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
            <div className="h-7 w-12 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="h-4 w-36 rounded bg-slate-200 animate-pulse" />
        <div className="h-48 w-full rounded-lg bg-slate-100 animate-pulse" />
      </div>

      {/* Second chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
        <div className="h-36 w-full rounded-lg bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}
