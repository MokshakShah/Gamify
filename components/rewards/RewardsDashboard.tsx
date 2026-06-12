'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

type RewardStats = {
  totalRewards: number;
  currentStreak: number;
  longestStreak: number;
  visitedToday: boolean;
};

export default function RewardsDashboard() {
  const { userId, isSignedIn } = useAuth();
  const [rewardStats, setRewardStats] = useState<RewardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Get reward status
  const fetchRewardStats = async () => {
    if (!isSignedIn || !userId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/rewards/daily-visit');
      
      if (response.ok) {
        const stats: RewardStats = await response.json();
        setRewardStats(stats);
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

  if (!isSignedIn) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Rewards</h2>
        <p className="text-gray-600">Sign in to start earning daily visit rewards!</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Rewards</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!rewardStats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Rewards</h2>
        <p className="text-gray-600">Unable to load reward stats.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Daily Rewards</h2>
        <div className="flex items-center space-x-2">
          {rewardStats.visitedToday ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Visited Today
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              ⏰ Visit Today for +1
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Rewards */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🏆</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Rewards</p>
              <p className="text-2xl font-bold text-blue-600">{rewardStats.totalRewards}</p>
            </div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🔥</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Current Streak</p>
              <p className="text-2xl font-bold text-orange-600">{rewardStats.currentStreak}</p>
              <p className="text-xs text-gray-500">days in a row</p>
            </div>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">⭐</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Best Streak</p>
              <p className="text-2xl font-bold text-purple-600">{rewardStats.longestStreak}</p>
              <p className="text-xs text-gray-500">personal record</p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-2">How Daily Rewards Work</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-center">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
            Visit the site once per day to earn +1 reward
          </li>
          <li className="flex items-center">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
            Multiple visits per day = still only +1 reward
          </li>
          <li className="flex items-center">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
            Build streaks by visiting consecutive days
          </li>
          <li className="flex items-center">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
            Break your personal streak records for bonus recognition
          </li>
        </ul>
      </div>

      {/* Refresh button */}
      <div className="mt-4">
        <button
          onClick={fetchRewardStats}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          🔄 Refresh Stats
        </button>
      </div>
    </div>
  );
}