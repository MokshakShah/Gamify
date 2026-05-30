-- URL-friendly public chat id for sharing and routing (/dashboard/chat/{chat_id}).
-- Run after 003_chat.sql.

alter table public.chat_threads
  add column if not exists chat_id text;

update public.chat_threads
set chat_id = replace(id::text, '-', '')
where chat_id is null;

alter table public.chat_threads
  alter column chat_id set not null;

create unique index if not exists chat_threads_chat_id_uidx
  on public.chat_threads (chat_id);

comment on column public.chat_threads.chat_id is 'Public slug used in URLs and share links';
