-- Chat attachments stored in Supabase storage.
-- Run after 004_chat_public_id.sql.

create table if not exists public.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  clerk_user_id text not null references public.profiles (clerk_user_id) on delete cascade,
  chat_id text not null,
  file_path text not null,
  file_name text not null,
  content_type text,
  size_bytes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists chat_attachments_user_created_idx
  on public.chat_attachments (clerk_user_id, created_at desc);

create index if not exists chat_attachments_thread_idx
  on public.chat_attachments (thread_id, created_at desc);

alter table public.chat_attachments enable row level security;

comment on table public.chat_attachments is 'File attachments uploaded within chat threads';
comment on column public.chat_attachments.file_path is 'Storage object path in the chat-attachments bucket';
