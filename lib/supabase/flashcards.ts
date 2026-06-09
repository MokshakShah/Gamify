import { getSupabaseAdmin } from './admin';
import { McqQuestion } from './mcq';

export type Flashcard = {
  id: string;
  clerk_user_id: string;
  mcq_question_id: string;
  added_at: string;
};

export type FlashcardWithQuestion = {
  id: string;
  mcq_question_id: string;
  added_at: string;
  question: McqQuestion;
  mcq_set_title: string;
  mcq_set_topic: string;
};

export async function addToFlashcards(
  clerkUserId: string,
  mcqQuestionId: string
): Promise<Flashcard | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('flashcards')
    .insert({
      clerk_user_id: clerkUserId,
      mcq_question_id: mcqQuestionId,
    })
    .select()
    .single();

  if (error) {
    // If it's a unique constraint violation, that's okay - already favorited
    if (error.code === '23505') {
      console.log('Question already in flashcards');
      return null;
    }
    console.error('[supabase] addToFlashcards failed:', error);
    return null;
  }

  return data;
}

export async function removeFromFlashcards(
  clerkUserId: string,
  mcqQuestionId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('clerk_user_id', clerkUserId)
    .eq('mcq_question_id', mcqQuestionId);

  if (error) {
    console.error('[supabase] removeFromFlashcards failed:', error);
  }
}

export async function isQuestionInFlashcards(
  clerkUserId: string,
  mcqQuestionId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('flashcards')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .eq('mcq_question_id', mcqQuestionId)
    .maybeSingle();

  if (error) {
    console.error('[supabase] isQuestionInFlashcards failed:', error);
    return false;
  }

  return !!data;
}

export async function listFlashcardsForUser(
  clerkUserId: string
): Promise<FlashcardWithQuestion[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('flashcards')
    .select(`
      id,
      mcq_question_id,
      added_at,
      mcq_questions:mcq_question_id (
        id,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        explanation,
        question_order,
        created_at,
        mcq_sets:mcq_set_id (
          title,
          topic
        )
      )
    `)
    .eq('clerk_user_id', clerkUserId)
    .order('added_at', { ascending: false });

  if (error) {
    console.error('[supabase] listFlashcardsForUser failed:', error);
    return [];
  }

  if (!data) return [];

  // Transform the data to the expected format
  return data
    .filter(item => item.mcq_questions && (item.mcq_questions as any).mcq_sets)
    .map(item => ({
      id: item.id,
      mcq_question_id: item.mcq_question_id,
      added_at: item.added_at,
      question: item.mcq_questions as any,
      mcq_set_title: (item.mcq_questions as any).mcq_sets.title,
      mcq_set_topic: (item.mcq_questions as any).mcq_sets.topic,
    }));
}

export async function getFlashcardStats(clerkUserId: string): Promise<{
  total: number;
  addedToday: number;
  addedThisWeek: number;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { total: 0, addedToday: 0, addedThisWeek: 0 };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalResult, todayResult, weekResult] = await Promise.all([
    supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('clerk_user_id', clerkUserId),
    
    supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('clerk_user_id', clerkUserId)
      .gte('added_at', today.toISOString()),
    
    supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('clerk_user_id', clerkUserId)
      .gte('added_at', weekAgo.toISOString())
  ]);

  return {
    total: totalResult.count || 0,
    addedToday: todayResult.count || 0,
    addedThisWeek: weekResult.count || 0,
  };
}