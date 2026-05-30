import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import {
  deleteChatThreadByChatId,
  getChatThreadByChatId,
  listChatMessagesForThread,
  updateChatThreadTitleByChatId,
} from '@/lib/supabase/chat';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { chatId: string } };

function toMessageClient(row: {
  id: string;
  role: string;
  content: string;
  created_at: string;
}) {
  return {
    id: row.id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    createdAt: row.created_at,
  };
}

function toThreadClient(row: {
  id: string;
  chat_id: string;
  title: string;
  updated_at: string;
}) {
  return {
    id: row.id,
    chatId: row.chat_id,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

/** Load messages for one chat (by public chat_id). */
export async function GET(_req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = params;

  try {
    const thread = await getChatThreadByChatId(userId, chatId);
    if (!thread) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }

    const messages = await listChatMessagesForThread(thread.id);
    return NextResponse.json({
      thread: toThreadClient(thread),
      messages: messages.map(toMessageClient),
    });
  } catch (err) {
    console.error('[chat GET]', err);
    return NextResponse.json(
      { error: 'Failed to load chat.' },
      { status: 500 }
    );
  }
}

/** Rename chat. */
export async function PATCH(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = params;

  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'title is required.' }, { status: 400 });
  }

  try {
    const thread = await updateChatThreadTitleByChatId(userId, chatId, title);
    if (!thread) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }
    return NextResponse.json({ thread: toThreadClient(thread) });
  } catch (err) {
    console.error('[chat PATCH]', err);
    return NextResponse.json(
      { error: 'Failed to rename chat.' },
      { status: 500 }
    );
  }
}

/** Delete chat + messages (by public chat_id). */
export async function DELETE(_req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = params;

  try {
    const thread = await getChatThreadByChatId(userId, chatId);
    if (!thread) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }

    await deleteChatThreadByChatId(userId, chatId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[chat DELETE]', err);
    return NextResponse.json(
      { error: 'Failed to delete chat.' },
      { status: 500 }
    );
  }
}
