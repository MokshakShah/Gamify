import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { summarizeYoutubeTranscript } from '@/lib/groq/summarize-transcript';
import { extractSummaryTopic } from '@/lib/summary/summary-markdown';
import { cleanYoutubeTitle } from '@/lib/youtube/clean-title';
import { upsertClerkProfile } from '@/lib/supabase/sync-clerk-profile';
import {
  getYoutubeSummaryForUserVideo,
  listYoutubeSummariesMetaForUser,
  upsertYoutubeSummary,
} from '@/lib/supabase/youtube-summaries';
import { fetchYoutubeMetadata } from '@/lib/youtube/metadata';
import { parseYoutubeUrl } from '@/lib/youtube/parse-url';
import { fetchYoutubeTranscript } from '@/lib/youtube/transcript';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function toMetaClient(row: {
  id: string;
  video_id: string;
  source_url: string;
  title: string | null;
  channel_name: string | null;
  summary?: string | null;
  status: string;
  error_message?: string | null;
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
    ...toMetaClient(row),
    summary: row.summary,
    errorMessage: row.error_message,
  };
}

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await listYoutubeSummariesMetaForUser(userId);
    return NextResponse.json({ items: rows.map(toMetaClient) });
  } catch (err) {
    console.error('[youtube upload GET]', err);
    return NextResponse.json(
      { error: 'Failed to load upload history.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = parseYoutubeUrl(body.url ?? '');
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          'Invalid YouTube URL. Use a link like https://www.youtube.com/watch?v=VIDEO_ID',
      },
      { status: 400 }
    );
  }

  const user = await currentUser();
  if (user) {
    try {
      await upsertClerkProfile(user);
    } catch (err) {
      console.error('[youtube upload] profile sync', err);
    }
  }

  try {
    const existing = await getYoutubeSummaryForUserVideo(
      userId,
      parsed.videoId
    );
    if (existing?.status === 'completed' && existing.summary) {
      return NextResponse.json({ item: toClient(existing), cached: true });
    }

    const metadata = await fetchYoutubeMetadata(parsed.normalizedUrl);

    await upsertYoutubeSummary({
      clerk_user_id: userId,
      video_id: parsed.videoId,
      source_url: parsed.normalizedUrl,
      title: metadata.title,
      channel_name: metadata.channelName,
      status: 'pending',
      transcript_available: false,
      summary: null,
      error_message: null,
    });

    const transcript = await fetchYoutubeTranscript(parsed.videoId);

    if (!transcript) {
      const declined = await upsertYoutubeSummary({
        clerk_user_id: userId,
        video_id: parsed.videoId,
        source_url: parsed.normalizedUrl,
        title: metadata.title,
        channel_name: metadata.channelName,
        status: 'declined_no_transcript',
        transcript_available: false,
        summary: null,
        error_message:
          'No captions/transcript available for this video. Summaries require an accessible YouTube transcript.',
      });

      return NextResponse.json(
        {
          error: declined.error_message,
          item: toClient(declined),
        },
        { status: 422 }
      );
    }

    const summary = await summarizeYoutubeTranscript({
      title: metadata.title,
      channelName: metadata.channelName,
      sourceUrl: parsed.normalizedUrl,
      transcript,
    });

    const displayTitle = extractSummaryTopic(
      summary,
      cleanYoutubeTitle(metadata.title)
    );

    const completed = await upsertYoutubeSummary({
      clerk_user_id: userId,
      video_id: parsed.videoId,
      source_url: parsed.normalizedUrl,
      title: displayTitle,
      channel_name: metadata.channelName,
      status: 'completed',
      transcript_available: true,
      summary,
      error_message: null,
    });

    return NextResponse.json({ item: toClient(completed), cached: false });
  } catch (err) {
    console.error('[youtube upload POST]', err);
    const message =
      err instanceof Error ? err.message : 'Failed to process video.';

    try {
      await upsertYoutubeSummary({
        clerk_user_id: userId,
        video_id: parsed.videoId,
        source_url: parsed.normalizedUrl,
        status: 'failed',
        transcript_available: false,
        summary: null,
        error_message: message,
      });
    } catch {
      /* ignore secondary failure */
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
