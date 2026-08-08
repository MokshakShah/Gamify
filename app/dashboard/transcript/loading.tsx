export default function TranscriptLoading() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
      {/* Timestamp + line pairs */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4">
          <div className="h-3 w-12 shrink-0 rounded bg-slate-200 animate-pulse mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
