import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type ChatAttachmentRow = {
  id: string;
  thread_id: string;
  clerk_user_id: string;
  chat_id: string;
  file_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number;
  extraction_status?: string | null;
  extraction_error?: string | null;
  chunk_count?: number | null;
  created_at: string;
};

export async function countChatAttachmentsSince(
  clerkUserId: string,
  sinceIso: string
): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('chat_attachments')
    .select('*', { count: 'exact', head: true })
    .eq('clerk_user_id', clerkUserId)
    .gte('created_at', sinceIso);

  if (error) throw error;
  return count ?? 0;
}

export async function createChatAttachment(row: {
  thread_id: string;
  clerk_user_id: string;
  chat_id: string;
  file_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number;
}): Promise<ChatAttachmentRow> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('chat_attachments')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return data as ChatAttachmentRow;
}

export async function getChatAttachmentById(
  clerkUserId: string,
  attachmentId: string
): Promise<ChatAttachmentRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('chat_attachments')
    .select('*')
    .eq('id', attachmentId)
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return data as ChatAttachmentRow | null;
}

export async function deleteChatAttachmentById(
  clerkUserId: string,
  attachmentId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('chat_attachments')
    .delete()
    .eq('id', attachmentId)
    .eq('clerk_user_id', clerkUserId);

  if (error) throw error;
}

export async function updateChatAttachmentExtraction(
  clerkUserId: string,
  attachmentId: string,
  status: 'pending' | 'completed' | 'failed' | 'skipped',
  errorMessage: string | null,
  chunkCount: number
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('chat_attachments')
    .update({
      extraction_status: status,
      extraction_error: errorMessage,
      chunk_count: chunkCount,
    })
    .eq('id', attachmentId)
    .eq('clerk_user_id', clerkUserId);

  if (error) throw error;
}
