import { PanelShell } from '@/components/dashboard/PanelShell';

export default function McqPage() {
  return (
    <PanelShell
      title="MCQ"
      description="Practice quizzes with timed sessions and scoring."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        MCQ workflow will appear here.
      </div>
    </PanelShell>
  );
}
