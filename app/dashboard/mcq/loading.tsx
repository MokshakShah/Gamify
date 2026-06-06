export default function MCQLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-7 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
      </div>
      
      {/* Grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
              <div className="h-7 w-20 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}