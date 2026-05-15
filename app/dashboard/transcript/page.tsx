import { PanelShell } from '@/components/dashboard/PanelShell';

export default function TranscriptPage() {
  return (
    <PanelShell
      title="Transcript"
      description="Review searchable transcripts with timestamps."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Transcript content will appear here.
      </div>
    </PanelShell>
  );
}
