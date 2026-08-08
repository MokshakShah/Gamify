export default function FlashcardsLoading() {
  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 rounded bg-slate-200 animate-pulse" />
        <div className="h-8 w-32 rounded-lg bg-slate-200 animate-pulse" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-3 rounded-full bg-slate-100 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="h-8 w-full rounded-lg bg-slate-100 animate-pulse mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
