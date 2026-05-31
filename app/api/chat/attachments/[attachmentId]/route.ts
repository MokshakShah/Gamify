import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  deleteChatAttachmentById,
  getChatAttachmentById,
} from '@/lib/supabase/chat-attachments';

export const dynamic = 'force-dynamic';

const BUCKET = 'chat-attachments';

type RouteContext = { params: { attachmentId: string } };

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const attachment = await getChatAttachmentById(userId, params.attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured.' },
        { status: 500 }
      );
    }

    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([attachment.file_path]);

    if (removeError) throw removeError;

    await deleteChatAttachmentById(userId, params.attachmentId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[chat attachments DELETE]', err);
    return NextResponse.json(
      { error: 'Failed to delete attachment.' },
      { status: 500 }
    );
  }
}
