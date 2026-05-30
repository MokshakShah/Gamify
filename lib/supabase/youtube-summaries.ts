import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type YoutubeSummaryRow = {
  id: string;
  clerk_user_id: string;
  video_id: string;
  source_url: string;
  title: string | null;
  channel_name: string | null;
  summary: string | null;
  transcript_available: boolean;
  status: 'pending' | 'completed' | 'declined_no_transcript' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export async function getYoutubeSummaryForUserVideo(
  clerkUserId: string,
  videoId: string
): Promise<YoutubeSummaryRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('youtube_summaries')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('video_id', videoId)
    .maybeSingle();

  if (error) throw error;
  return data as YoutubeSummaryRow | null;
}

const metaSelect =
  'id, clerk_user_id, video_id, source_url, title, channel_name, status, error_message, transcript_available, created_at, updated_at';

export type YoutubeSummaryMetaRow = Omit<YoutubeSummaryRow, 'summary'>;

/** Sidebar list — no summary body (fast). */
export async function listYoutubeSummariesMetaForUser(
  clerkUserId: string
): Promise<YoutubeSummaryMetaRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('youtube_summaries')
    .select(metaSelect)
    .eq('clerk_user_id', clerkUserId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as YoutubeSummaryMetaRow[];
}

/** @deprecated Prefer listYoutubeSummariesMetaForUser for history lists. */
export async function listYoutubeSummariesForUser(
  clerkUserId: string
): Promise<YoutubeSummaryRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('youtube_summaries')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as YoutubeSummaryRow[];
}

export async function getYoutubeSummaryById(
  clerkUserId: string,
  summaryId: string
): Promise<YoutubeSummaryRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('youtube_summaries')
    .select('*')
    .eq('id', summaryId)
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return data as YoutubeSummaryRow | null;
}

export async function updateYoutubeSummaryTitle(
  clerkUserId: string,
  summaryId: string,
  title: string
): Promise<YoutubeSummaryMetaRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('youtube_summaries')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', summaryId)
    .eq('clerk_user_id', clerkUserId)
    .select(metaSelect)
    .maybeSingle();

  if (error) throw error;
  return data as YoutubeSummaryMetaRow | null;
}

export async function deleteYoutubeSummaryById(
  clerkUserId: string,
  summaryId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('youtube_summaries')
    .delete()
    .eq('id', summaryId)
    .eq('clerk_user_id', clerkUserId);

  if (error) throw error;
}

export async function upsertYoutubeSummary(
  row: Partial<YoutubeSummaryRow> & {
    clerk_user_id: string;
    video_id: string;
    source_url: string;
    status: YoutubeSummaryRow['status'];
    transcript_available: boolean;
  }
): Promise<YoutubeSummaryRow> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('youtube_summaries')
    .upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: 'clerk_user_id,video_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as YoutubeSummaryRow;
}
