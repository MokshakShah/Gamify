import { PanelShell } from '@/components/dashboard/PanelShell';

export default function RewardsPage() {
  return (
    <PanelShell
      title="Rewards"
      description="Earn XP, badges, and streak rewards for consistency."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Rewards will appear here.
      </div>
    </PanelShell>
  );
}
