'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

type RewardStats = {
  totalRewards: number;
  currentStreak: number;
  longestStreak: number;
  visitedToday: boolean;
};

type DailyVisitResult = {
  rewardGiven: boolean;
  totalRewards: number;
  currentStreak: number;
  isNewStreakRecord: boolean;
  message?: string;
};

export default function DailyVisitTracker() {
  const { userId, isSignedIn } = useAuth();
  const [rewardStats, setRewardStats] = useState<RewardStats | null>(null);
  const [showRewardNotification, setShowRewardNotification] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [hasCheckedToday, setHasCheckedToday] = useState(false);

  // Track daily visit and award reward on first visit of the day
  const trackDailyVisit = async () => {
    if (!isSignedIn || !userId || hasCheckedToday) return;

    try {
      console.log('[Daily Visit] Tracking daily visit...');
      
      const response = await fetch('/api/rewards/daily-visit', {
        method: 'POST',
      });

      if (response.ok) {
        const result: DailyVisitResult = await response.json();
        
        // Update stats
        setRewardStats({
          totalRewards: result.totalRewards,
          currentStreak: result.currentStreak,
          longestStreak: 0, // We'll get this from the status endpoint
          visitedToday: true,
        });

        // Show reward notification if reward was given
        if (result.rewardGiven && result.message) {
          setRewardMessage(result.message);
          setShowRewardNotification(true);
          
          // Auto-hide notification after 5 seconds
          setTimeout(() => {
            setShowRewardNotification(false);
          }, 5000);
        }

        setHasCheckedToday(true);
        
        // Store in localStorage to prevent multiple calls per session
        localStorage.setItem('dailyVisitChecked', new Date().toISOString().split('T')[0]);
        
      } else {
        console.error('[Daily Visit] Failed to track visit:', response.status);
      }
    } catch (error) {
      console.error('[Daily Visit] Error tracking visit:', error);
    }
  };

  // Get current reward status
  const getRewardStatus = async () => {
    if (!isSignedIn || !userId) return;

    try {
      const response = await fetch('/api/rewards/daily-visit');
      
      if (response.ok) {
        const stats: RewardStats = await response.json();
        setRewardStats(stats);
      }
    } catch (error) {
      console.error('[Daily Visit] Error getting reward status:', error);
    }
  };

  // Check if we already tracked visit today (to prevent multiple API calls)
  const checkIfAlreadyTracked = () => {
    const lastChecked = localStorage.getItem('dailyVisitChecked');
    const today = new Date().toISOString().split('T')[0];
    return lastChecked === today;
  };

  // Track visit on component mount
  useEffect(() => {
    if (!isSignedIn || !userId) return;

    // Check if we already tracked today
    if (checkIfAlreadyTracked()) {
      setHasCheckedToday(true);
      // Just get status, don't track again
      getRewardStatus();
    } else {
      // Track daily visit (which will award reward if it's first time today)
      trackDailyVisit();
    }
  }, [isSignedIn, userId]);

  // Close notification manually
  const closeNotification = () => {
    setShowRewardNotification(false);
  };

  // Don't render anything if user is not signed in
  if (!isSignedIn || !rewardStats) {
    return null;
  }

  return (
    <>
      {/* Reward Notification */}
      {showRewardNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    🎉
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">{rewardMessage}</p>
                  <p className="text-xs text-green-100">
                    Total: {rewardStats.totalRewards} rewards
                  </p>
                </div>
              </div>
              <button
                onClick={closeNotification}
                className="text-white/70 hover:text-white ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reward Stats Display (Optional - can be shown in header or dashboard) */}
      <div className="hidden">
        <div className="text-xs text-gray-600">
          🏆 {rewardStats.totalRewards} | 🔥 {rewardStats.currentStreak} days
        </div>
      </div>
    </>
  );
}