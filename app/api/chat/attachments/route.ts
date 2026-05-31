import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getChatThreadByChatId } from '@/lib/supabase/chat';
import {
  countChatAttachmentsSince,
  createChatAttachment,
} from '@/lib/supabase/chat-attachments';

export const dynamic = 'force-dynamic';

const BUCKET = 'chat-attachments';
const DAILY_LIMIT = 3;

function startOfUtcDay(): string {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return utc.toISOString();
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const chatId = String(form.get('chatId') ?? '').trim();
  const file = form.get('file');
  if (!chatId) {
    return NextResponse.json({ error: 'chatId is required.' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required.' }, { status: 400 });
  }

  try {
    const thread = await getChatThreadByChatId(userId, chatId);
    if (!thread) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }

    const since = startOfUtcDay();
    const count = await countChatAttachmentsSince(userId, since);
    if (count >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: 'Daily attachment limit reached.' },
        { status: 429 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured.' },
        { status: 500 }
      );
    }

    const safeName = sanitizeFileName(file.name || 'attachment');
    const objectPath = `${userId}/${chatId}/${Date.now()}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const attachment = await createChatAttachment({
      thread_id: thread.id,
      clerk_user_id: userId,
      chat_id: chatId,
      file_path: objectPath,
      file_name: file.name || safeName,
      content_type: file.type || null,
      size_bytes: file.size,
    });

    const { data: publicUrl } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(objectPath);

    return NextResponse.json({
      attachment: {
        id: attachment.id,
        chatId,
        fileName: attachment.file_name,
        contentType: attachment.content_type,
        sizeBytes: attachment.size_bytes,
        createdAt: attachment.created_at,
        url: publicUrl.publicUrl,
      },
    });
  } catch (err) {
    console.error('[chat attachments POST]', err);
    return NextResponse.json(
      { error: 'Failed to upload attachment.' },
      { status: 500 }
    );
  }
}
