-- YouTube URL summaries (one row per user + video).
-- Run after 001_profiles.sql.

create table if not exists public.youtube_summaries (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.profiles (clerk_user_id) on delete cascade,
  video_id text not null,
  source_url text not null,
  title text,
  channel_name text,
  summary text,
  transcript_available boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'declined_no_transcript', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_user_id, video_id)
);

create index if not exists youtube_summaries_user_created_idx
  on public.youtube_summaries (clerk_user_id, created_at desc);

alter table public.youtube_summaries enable row level security;

comment on table public.youtube_summaries is 'Groq-generated summaries from YouTube captions';
