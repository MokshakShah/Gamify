-- Daily Visit Reward System Migration
-- Adds reward tracking and daily visit functionality

-- Add reward columns to profiles table
alter table public.profiles 
add column if not exists total_rewards integer not null default 0,
add column if not exists last_visit_date date,
add column if not exists current_streak integer not null default 0,
add column if not exists longest_streak integer not null default 0;

-- Create daily_visits table to track visit history
create table if not exists public.daily_visits (
  id bigserial primary key,
  clerk_user_id text not null references public.profiles(clerk_user_id) on delete cascade,
  visit_date date not null,
  reward_given boolean not null default false,
  created_at timestamptz not null default now(),
  unique(clerk_user_id, visit_date)
);

-- Add indexes for performance
create index if not exists daily_visits_user_date_idx on public.daily_visits (clerk_user_id, visit_date desc);
create index if not exists daily_visits_date_idx on public.daily_visits (visit_date desc);
create index if not exists profiles_last_visit_idx on public.profiles (last_visit_date desc);

-- Enable RLS
alter table public.daily_visits enable row level security;

-- Add comments
comment on table public.daily_visits is 'Tracks daily visits for reward system';
comment on column public.profiles.total_rewards is 'Total reward points earned by user';
comment on column public.profiles.last_visit_date is 'Last date user visited the site';
comment on column public.profiles.current_streak is 'Current consecutive days visited';
comment on column public.profiles.longest_streak is 'Longest consecutive days streak achieved';

-- Create function to update user streaks and rewards
create or replace function public.update_daily_visit_reward(user_id text)
returns table(
  reward_given boolean,
  new_total_rewards integer,
  current_streak integer,
  is_new_streak_record boolean
) 
language plpgsql
security definer
as $$
declare
  today_date date := current_date;
  user_profile record;
  visit_exists boolean;
  yesterday_date date := current_date - interval '1 day';
  reward_amount integer := 1;
  new_streak integer;
  streak_record boolean := false;
begin
  -- Get current user profile
  select * into user_profile 
  from public.profiles 
  where clerk_user_id = user_id;
  
  if not found then
    -- User doesn't exist, return no reward
    return query select false, 0, 0, false;
    return;
  end if;
  
  -- Check if visit already exists today
  select exists(
    select 1 from public.daily_visits 
    where clerk_user_id = user_id and visit_date = today_date
  ) into visit_exists;
  
  if visit_exists then
    -- Already visited today, return current stats without new reward
    return query select false, user_profile.total_rewards, user_profile.current_streak, false;
    return;
  end if;
  
  -- Insert today's visit
  insert into public.daily_visits (clerk_user_id, visit_date, reward_given)
  values (user_id, today_date, true)
  on conflict (clerk_user_id, visit_date) do nothing;
  
  -- Calculate new streak
  if user_profile.last_visit_date = yesterday_date then
    -- Consecutive day, increment streak
    new_streak := user_profile.current_streak + 1;
  else
    -- Not consecutive, reset streak
    new_streak := 1;
  end if;
  
  -- Check if it's a new longest streak record
  if new_streak > user_profile.longest_streak then
    streak_record := true;
  end if;
  
  -- Update user profile with reward and streak
  update public.profiles
  set 
    total_rewards = total_rewards + reward_amount,
    last_visit_date = today_date,
    current_streak = new_streak,
    longest_streak = greatest(longest_streak, new_streak),
    updated_at = now()
  where clerk_user_id = user_id;
  
  -- Return the results
  return query select 
    true as reward_given,
    (user_profile.total_rewards + reward_amount) as new_total_rewards,
    new_streak as current_streak,
    streak_record as is_new_streak_record;
end;
$$;

-- Grant execute permission to service role
grant execute on function public.update_daily_visit_reward(text) to service_role;

comment on function public.update_daily_visit_reward is 'Awards daily visit reward and updates streak for a user';