-- Run this in the Supabase SQL editor (or via Supabase CLI) before relying on profile sync.
-- Stores one row per Clerk user; server uses service role to upsert.

create table if not exists public.profiles (
  clerk_user_id text primary key,
  email text,
  first_name text,
  last_name text,
  image_url text,
  username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

-- Intentionally no policies: only the backend uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- Add SELECT policies later if you expose Supabase to the browser with a custom JWT.

comment on table public.profiles is 'Clerk users mirrored from app sign-in for app-owned data in Supabase';
