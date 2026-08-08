export default function DashboardLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
          <div className="h-7 w-16 rounded bg-slate-300 animate-pulse" />
          <div className="h-3 w-40 rounded bg-slate-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
