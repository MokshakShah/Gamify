import { PanelShell } from '@/components/dashboard/PanelShell';

export default function AnalyticsPage() {
  return (
    <PanelShell
      title="Analytics"
      description="Track strengths, weak areas, and learning streaks."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Analytics charts will appear here.
      </div>
    </PanelShell>
  );
}
