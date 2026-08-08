export default function RewardsLoading() {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="h-5 w-24 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-56 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="h-6 w-24 rounded-full bg-slate-200 animate-pulse" />
      </div>

      {/* Stat rings + heatmap */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        {/* 4 rings */}
        <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:grid-cols-2 lg:gap-x-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[88px] w-[88px] rounded-full bg-slate-100 animate-pulse" />
          ))}
        </div>

        {/* Heatmap area */}
        <div className="min-h-[140px] flex-1 rounded-lg bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}
