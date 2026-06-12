import { PanelShell } from '@/components/dashboard/PanelShell';
import RewardsDashboard from '@/components/rewards/RewardsDashboard';

export default function RewardsPage() {
  return (
    <PanelShell
      title="Rewards"
      description="Earn daily visit rewards and build streaks for consistency."
    >
      <RewardsDashboard />
    </PanelShell>
  );
}
