'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';

import { StatRing } from '@/components/rewards/StatRing';
import { VisitContributionGraph } from '@/components/rewards/VisitContributionGraph';
import { buildContributionGrid } from '@/lib/rewards/contribution-grid';

type RewardStats = {
  totalRewards: number;
  currentStreak: number;
  longestStreak: number;
  visitedToday: boolean;
  visitDates: string[];
};

export default function RewardsDashboard() {
  const { userId, isSignedIn } = useAuth();
  const [rewardStats, setRewardStats] = useState<RewardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRewardStats = async () => {
    if (!isSignedIn || !userId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/rewards/daily-visit');

      if (response.ok) {
        const stats: RewardStats = await response.json();
        setRewardStats({
          ...stats,
          visitDates: stats.visitDates ?? [],
        });
      } else {
        console.error('Failed to fetch reward stats:', response.status);
      }
    } catch (error) {
      console.error('Error fetching reward stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewardStats();
  }, [isSignedIn, userId]);

  const activeDays = useMemo(
    () =>
      rewardStats
        ? buildContributionGrid(rewardStats.visitDates).totalVisits
        : 0,
    [rewardStats]
  );

  if (!isSignedIn) {
    return (
      <div className="w-full rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">Sign in to track your daily visit streak.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full animate-pulse rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex shrink-0 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[88px] w-[88px] rounded-full bg-gray-100" />
            ))}
          </div>
          <div className="min-h-[140px] flex-1 rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!rewardStats) {
    return (
      <div className="w-full rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">Unable to load reward stats.</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
          <p className="text-sm text-gray-500">One visit per day counts toward your streak</p>
        </div>
        {rewardStats.visitedToday ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            Visited today
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Visit today for +1
          </span>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        {/* LeetCode-style stat rings */}
        <div className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:grid-cols-2 lg:gap-x-4 xl:grid-cols-4">
          <StatRing
            label="Active days"
            value={activeDays}
            max={365}
            color="#ffa116"
          />
          <StatRing
            label="Current streak"
            value={rewardStats.currentStreak}
            max={Math.max(rewardStats.longestStreak, 30, rewardStats.currentStreak)}
            color="#ef4444"
          />
          <StatRing
            label="Max streak"
            value={rewardStats.longestStreak}
            max={Math.max(rewardStats.longestStreak, 30)}
            color="#8b5cf6"
          />
          <StatRing
            label="Total rewards"
            value={rewardStats.totalRewards}
            max={Math.max(rewardStats.totalRewards, 100)}
            color="#22c55e"
          />
        </div>

        {/* GitHub-style heatmap — fills remaining width */}
        <VisitContributionGraph visitDates={rewardStats.visitDates} />
      </div>
    </div>
  );
}
