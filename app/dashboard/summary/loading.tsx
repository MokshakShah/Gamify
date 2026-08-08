export default function SummaryLoading() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
        <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded bg-slate-100 animate-pulse"
              style={{ width: `${70 + Math.random() * 30}%` }}
            />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
        <div className="h-4 w-36 rounded bg-slate-200 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 w-full rounded bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
