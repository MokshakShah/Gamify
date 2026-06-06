export default function DashboardLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="text-sm text-slate-600">Loading dashboard...</span>
      </div>
    </div>
  );
}