import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { getLocalDateKey, normalizeDateKey, uniqueVisitDates } from '@/lib/rewards/date-key';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type DailyVisitRewardResponse = {
  rewardGiven: boolean;
  totalRewards: number;
  currentStreak: number;
  isNewStreakRecord: boolean;
  message?: string;
};

export async function POST() {
  const { userId } = auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error('Supabase admin client not available');
    }

    // Call the daily visit reward function
    const { data, error } = await supabase
      .rpc('update_daily_visit_reward', {
        user_id: userId
      });

    if (error) {
      console.error('[Daily Visit Reward] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to process daily visit reward' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        rewardGiven: false,
        totalRewards: 0,
        currentStreak: 0,
        isNewStreakRecord: false,
        message: 'User not found'
      });
    }

    const result = data[0];
    let message = '';

    if (result.reward_given) {
      if (result.is_new_streak_record) {
        message = `🎉 +1 reward! New streak record: ${result.current_streak} days! 🔥`;
      } else if (result.current_streak > 1) {
        message = `🎉 +1 reward! ${result.current_streak} day streak! 🔥`;
      } else {
        message = '🎉 +1 daily visit reward! Welcome back! ✨';
      }
      
      console.log(`[Daily Visit Reward] Awarded +1 to user ${userId}. Total: ${result.new_total_rewards}, Streak: ${result.current_streak}`);
    } else {
      message = `Welcome back! You've already earned today's reward. Streak: ${result.current_streak} days 🔥`;
    }

    const response: DailyVisitRewardResponse = {
      rewardGiven: result.reward_given,
      totalRewards: result.new_total_rewards,
      currentStreak: result.current_streak,
      isNewStreakRecord: result.is_new_streak_record,
      message
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Daily Visit Reward] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current reward status without awarding
export async function GET() {
  const { userId } = auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error('Supabase admin client not available');
    }

    // Get user's current reward stats
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('total_rewards, current_streak, longest_streak, last_visit_date')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        totalRewards: 0,
        currentStreak: 0,
        longestStreak: 0,
        visitedToday: false,
        visitDates: [],
      });
    }

    // Check if user visited today
    const today = getLocalDateKey();
    const lastVisit = profile.last_visit_date
      ? normalizeDateKey(String(profile.last_visit_date))
      : null;
    const visitedToday = lastVisit === today;

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 364);
    const historyStart = getLocalDateKey(oneYearAgo);

    const { data: visits, error: visitsError } = await supabase
      .from('daily_visits')
      .select('visit_date')
      .eq('clerk_user_id', userId)
      .gte('visit_date', historyStart)
      .order('visit_date', { ascending: true });

    if (visitsError) {
      console.error('[Daily Visit Reward] Visit history error:', visitsError);
    }

    let visitDates = uniqueVisitDates(
      (visits ?? []).map((row: { visit_date: string }) => row.visit_date)
    );

    if (lastVisit && !visitDates.includes(lastVisit)) {
      visitDates = uniqueVisitDates([...visitDates, lastVisit]);
    }

    return NextResponse.json({
      totalRewards: profile.total_rewards || 0,
      currentStreak: profile.current_streak || 0,
      longestStreak: profile.longest_streak || 0,
      visitedToday,
      visitDates,
    });

  } catch (error) {
    console.error('[Daily Visit Reward] Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get reward status' },
      { status: 500 }
    );
  }
}