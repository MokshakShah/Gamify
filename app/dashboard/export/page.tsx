import { PanelShell } from '@/components/dashboard/PanelShell';

export default function ExportPage() {
  return (
    <PanelShell
      title="Export PDF"
      description="Export summaries, quizzes, and flashcards in one click."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Export controls will appear here.
      </div>
    </PanelShell>
  );
}
