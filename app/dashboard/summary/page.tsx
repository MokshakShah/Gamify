import { PanelShell } from '@/components/dashboard/PanelShell';

export default function SummaryPage() {
  return (
    <PanelShell
      title="Summary"
      description="Generate short, detailed, and exam-ready notes."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Summary output will appear here.
      </div>
    </PanelShell>
  );
}
