import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import {
  addChatMessage,
  getChatThreadByChatId,
  updateChatThreadTitleByChatId,
} from '@/lib/supabase/chat';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { chatId: string } };

export async function POST(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = params;

  let body: {
    role?: 'user' | 'assistant';
    content?: string;
    title?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const role = body.role;
  const content = body.content?.trim();
  if (!role || (role !== 'user' && role !== 'assistant') || !content) {
    return NextResponse.json(
      { error: 'role and content are required.' },
      { status: 400 }
    );
  }

  try {
    const thread = await getChatThreadByChatId(userId, chatId);
    if (!thread) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }

    let title = thread.title;
    if (body.title?.trim()) {
      const updated = await updateChatThreadTitleByChatId(
        userId,
        chatId,
        body.title.trim()
      );
      title = updated?.title ?? body.title.trim();
    }

    const message = await addChatMessage(thread.id, role, content);

    return NextResponse.json({
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at,
      },
      chatId: thread.chat_id,
      title,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[chat messages POST]', err);
    return NextResponse.json(
      { error: 'Failed to save message.' },
      { status: 500 }
    );
  }
}
