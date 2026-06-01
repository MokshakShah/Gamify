import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { chunkText } from '@/lib/pdf/chunk-text';
import { extractPdfText } from '@/lib/pdf/extract-pdf-text';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getChatThreadByChatId } from '@/lib/supabase/chat';
import { insertChatAttachmentChunks } from '@/lib/supabase/chat-attachment-chunks';
import {
  countChatAttachmentsSince,
  createChatAttachment,
  updateChatAttachmentExtraction,
} from '@/lib/supabase/chat-attachments';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const isPdf =
      file.type === 'application/pdf' ||
      safeName.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        const text = await extractPdfText(arrayBuffer);
        const chunks = chunkText(text, {
          maxTokens: 1000,
          overlapTokens: 150,
        });

        if (chunks.length > 0) {
          await insertChatAttachmentChunks(
            chunks.map((chunk, index) => ({
              attachment_id: attachment.id,
              thread_id: thread.id,
              clerk_user_id: userId,
              chat_id: chatId,
              chunk_index: index,
              content: chunk.content,
              token_count: chunk.tokenCount,
            }))
          );
        }

        await updateChatAttachmentExtraction(
          userId,
          attachment.id,
          'completed',
          null,
          chunks.length
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to extract PDF text.';
        try {
          await updateChatAttachmentExtraction(
            userId,
            attachment.id,
            'failed',
            message,
            0
          );
        } catch (updateErr) {
          console.error('[chat attachments extract]', updateErr);
        }
      }
    } else {
      try {
        await updateChatAttachmentExtraction(
          userId,
          attachment.id,
          'skipped',
          'Unsupported content type.',
          0
        );
      } catch (err) {
        console.error('[chat attachments extract]', err);
      }
    }

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
