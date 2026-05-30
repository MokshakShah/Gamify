import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import {
  deleteYoutubeSummaryById,
  getYoutubeSummaryById,
  updateYoutubeSummaryTitle,
} from '@/lib/supabase/youtube-summaries';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { summaryId: string } };

function toClient(row: {
  id: string;
  video_id: string;
  source_url: string;
  title: string | null;
  channel_name: string | null;
  summary: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}) {
  return {
    id: row.id,
    videoId: row.video_id,
    sourceUrl: row.source_url,
    title: row.title ?? 'YouTube video',
    channelName: row.channel_name ?? '',
    summary: row.summary,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

function toMetaClient(row: {
  id: string;
  video_id: string;
  source_url: string;
  title: string | null;
  channel_name: string | null;
  status: string;
  created_at: string;
}) {
  return {
    id: row.id,
    videoId: row.video_id,
    sourceUrl: row.source_url,
    title: row.title ?? 'YouTube video',
    channelName: row.channel_name ?? '',
    status: row.status,
    createdAt: row.created_at,
  };
}

/** Load one summary with full body (on demand). */
export async function GET(_req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const row = await getYoutubeSummaryById(userId, params.summaryId);
    if (!row) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json({ item: toClient(row) });
  } catch (err) {
    console.error('[youtube summary GET]', err);
    return NextResponse.json(
      { error: 'Failed to load summary.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    const row = await updateYoutubeSummaryTitle(
      userId,
      params.summaryId,
      title
    );
    if (!row) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json({ item: toMetaClient(row) });
  } catch (err) {
    console.error('[youtube summary PATCH]', err);
    return NextResponse.json(
      { error: 'Failed to rename.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const row = await getYoutubeSummaryById(userId, params.summaryId);
    if (!row) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    await deleteYoutubeSummaryById(userId, params.summaryId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[youtube summary DELETE]', err);
    return NextResponse.json(
      { error: 'Failed to delete.' },
      { status: 500 }
    );
  }
}
