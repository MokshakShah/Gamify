import { PanelShell } from '@/components/dashboard/PanelShell';

export default function DashboardPage() {
  return (
    <PanelShell
      title="Dashboard"
      description="Quick view of your learning activity and recent progress."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Weekly progress
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">0%</p>
          <p className="text-sm text-slate-600">Complete your first upload.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Total uploads
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">0</p>
          <p className="text-sm text-slate-600">Start with a YouTube link.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Quiz accuracy
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">--</p>
          <p className="text-sm text-slate-600">Create your first MCQ set.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Streak
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">0 days</p>
          <p className="text-sm text-slate-600">Log in daily to grow it.</p>
        </div>
      </div>
    </PanelShell>
  );
}
