import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type ChatAttachmentChunkInsert = {
  attachment_id: string;
  thread_id: string;
  clerk_user_id: string;
  chat_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
};

const INSERT_BATCH_SIZE = 200;

export async function insertChatAttachmentChunks(
  rows: ChatAttachmentChunkInsert[]
): Promise<void> {
  if (rows.length === 0) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is not configured.');

  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
    const { error } = await supabase
      .from('chat_attachment_chunks')
      .insert(batch);
    if (error) throw error;
  }
}
