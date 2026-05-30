import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { createChatThread, listChatThreadsForUser } from '@/lib/supabase/chat';

export const dynamic = 'force-dynamic';

function toThreadClient(row: {
  id: string;
  chat_id: string;
  title: string;
  updated_at: string;
  created_at: string;
}) {
  return {
    id: row.id,
    chatId: row.chat_id,
    title: row.title,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

/** List thread metadata only (no messages) — fast for sidebar + cache refresh. */
export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await listChatThreadsForUser(userId);
    return NextResponse.json({ threads: rows.map(toThreadClient) });
  } catch (err) {
    console.error('[chat threads GET]', err);
    return NextResponse.json(
      { error: 'Failed to load chat history.' },
      { status: 500 }
    );
  }
}

export async function POST() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const row = await createChatThread(userId);
    return NextResponse.json({ thread: toThreadClient(row) });
  } catch (err) {
    console.error('[chat threads POST]', err);
    return NextResponse.json(
      { error: 'Failed to create chat.' },
      { status: 500 }
    );
  }
}
