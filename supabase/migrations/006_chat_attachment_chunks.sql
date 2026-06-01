-- Text chunks extracted from chat attachments for retrieval.
-- Run after 005_chat_attachments.sql.

alter table public.chat_attachments
  add column if not exists extraction_status text not null default 'pending',
  add column if not exists extraction_error text,
  add column if not exists chunk_count integer not null default 0;

create table if not exists public.chat_attachment_chunks (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid not null references public.chat_attachments (id) on delete cascade,
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  clerk_user_id text not null references public.profiles (clerk_user_id) on delete cascade,
  chat_id text not null,
  chunk_index integer not null,
  content text not null,
  token_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists chat_attachment_chunks_attachment_idx
  on public.chat_attachment_chunks (attachment_id, chunk_index);

create index if not exists chat_attachment_chunks_user_created_idx
  on public.chat_attachment_chunks (clerk_user_id, created_at desc);

alter table public.chat_attachment_chunks enable row level security;

comment on table public.chat_attachment_chunks is 'Extracted text chunks for chat attachments';
comment on column public.chat_attachment_chunks.token_count is 'Approx token count based on word count';
