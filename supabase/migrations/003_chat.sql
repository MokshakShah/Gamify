-- AI chat threads and messages. Run after 001_profiles.sql.

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null unique,
  clerk_user_id text not null references public.profiles (clerk_user_id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists chat_threads_chat_id_uidx
  on public.chat_threads (chat_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_threads_user_updated_idx
  on public.chat_threads (clerk_user_id, updated_at desc);

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages (thread_id, created_at asc);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

comment on table public.chat_threads is 'Per-user AI chat sessions';
comment on table public.chat_messages is 'Messages within a chat thread';
