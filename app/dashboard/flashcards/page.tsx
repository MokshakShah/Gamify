import { PanelShell } from '@/components/dashboard/PanelShell';

export default function FlashcardsPage() {
  return (
    <PanelShell
      title="Flashcards"
      description="Flip through AI-generated cards and save tough ones."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Flashcards will appear here.
      </div>
    </PanelShell>
  );
}
