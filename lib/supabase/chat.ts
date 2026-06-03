import { generateChatId } from '@/lib/chat/generate-chat-id';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type ChatThreadRow = {
  id: string;
  chat_id: string;
  clerk_user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

const threadSelect =
  'id, chat_id, clerk_user_id, title, created_at, updated_at';

/** Lightweight list for sidebar — no message bodies. */
export async function listChatThreadsForUser(
  clerkUserId: string
): Promise<ChatThreadRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('chat_threads')
    .select(threadSelect)
    .eq('clerk_user_id', clerkUserId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ChatThreadRow[];
}

export async function getChatThreadByChatId(
  clerkUserId: string,
  chatId: string
): Promise<ChatThreadRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('chat_threads')
    .select(threadSelect)
    .eq('chat_id', chatId)
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return data as ChatThreadRow | null;
}

export async function listChatMessagesForThread(
  threadId: string
): Promise<ChatMessageRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, thread_id, role, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChatMessageRow[];
}

export type ChatAttachmentChunkRow = {
  id: string;
  attachment_id: string;
  thread_id: string;
  clerk_user_id: string;
  chat_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  created_at: string;
};

export async function listChatAttachmentChunks(
  threadId: string
): Promise<ChatAttachmentChunkRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('chat_attachment_chunks')
    .select('*')
    .eq('thread_id', threadId)
    .order('chunk_index', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChatAttachmentChunkRow[];
}

export async function createChatThread(
  clerkUserId: string,
  title = 'New chat'
): Promise<ChatThreadRow> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is not configured.');

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('chat_threads')
    .insert({
      clerk_user_id: clerkUserId,
      chat_id: generateChatId(),
      title,
      updated_at: now,
    })
    .select(threadSelect)
    .single();

  if (error) throw error;
  return data as ChatThreadRow;
}

export async function addChatMessage(
  threadId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessageRow> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is not configured.');

  const now = new Date().toISOString();

  const { data: msg, error: msgError } = await supabase
    .from('chat_messages')
    .insert({ thread_id: threadId, role, content })
    .select('id, thread_id, role, content, created_at')
    .single();

  if (msgError) throw msgError;

  await supabase
    .from('chat_threads')
    .update({ updated_at: now })
    .eq('id', threadId);

  return msg as ChatMessageRow;
}

export async function updateChatThreadTitleByChatId(
  clerkUserId: string,
  chatId: string,
  title: string
): Promise<ChatThreadRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('chat_threads')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .eq('clerk_user_id', clerkUserId)
    .select(threadSelect)
    .maybeSingle();

  if (error) throw error;
  return data as ChatThreadRow | null;
}

export async function deleteChatThreadByChatId(
  clerkUserId: string,
  chatId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('chat_threads')
    .delete()
    .eq('chat_id', chatId)
    .eq('clerk_user_id', clerkUserId);

  if (error) throw error;
}
