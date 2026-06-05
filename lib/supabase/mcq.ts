import { getSupabaseAdmin } from './admin';

export type McqSet = {
  id: string;
  clerk_user_id: string;
  title: string;
  topic: string;
  source_type: 'topic' | 'pdf' | 'youtube';
  source_id: string | null;
  created_at: string;
  updated_at: string;
};

export type McqQuestion = {
  id: string;
  mcq_set_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string; // Now required, not nullable
  question_order: number;
  created_at: string;
};

export type McqSetWithQuestions = McqSet & {
  questions: McqQuestion[];
};

export async function listMcqSetsForUser(
  clerkUserId: string
): Promise<McqSet[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('mcq_sets')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabase] listMcqSetsForUser failed:', error);
    return [];
  }

  return data ?? [];
}

export async function getMcqSetWithQuestions(
  clerkUserId: string,
  setId: string
): Promise<McqSetWithQuestions | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: mcqSet, error: setError } = await supabase
    .from('mcq_sets')
    .select('*')
    .eq('id', setId)
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (setError || !mcqSet) {
    console.error('[supabase] getMcqSetWithQuestions - set fetch failed:', setError);
    return null;
  }

  const { data: questions, error: questionsError } = await supabase
    .from('mcq_questions')
    .select('*')
    .eq('mcq_set_id', setId)
    .order('question_order', { ascending: true });

  if (questionsError) {
    console.error('[supabase] getMcqSetWithQuestions - questions fetch failed:', questionsError);
    return null;
  }

  return {
    ...mcqSet,
    questions: questions ?? [],
  };
}

export async function createMcqSet(
  clerkUserId: string,
  title: string,
  topic: string,
  sourceType: 'topic' | 'pdf' | 'youtube',
  sourceId?: string
): Promise<McqSet | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('mcq_sets')
    .insert({
      clerk_user_id: clerkUserId,
      title,
      topic,
      source_type: sourceType,
      source_id: sourceId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[supabase] createMcqSet failed:', error);
    return null;
  }

  return data;
}

export async function addMcqQuestions(
  mcqSetId: string,
  questions: Array<{
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: 'A' | 'B' | 'C' | 'D';
    explanation: string; // Now required
    question_order: number;
  }>
): Promise<McqQuestion[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('mcq_questions')
    .insert(
      questions.map((q) => ({
        mcq_set_id: mcqSetId,
        ...q,
      }))
    )
    .select();

  if (error) {
    console.error('[supabase] addMcqQuestions failed:', error);
    return [];
  }

  return data ?? [];
}

export async function deleteMcqSet(
  clerkUserId: string,
  setId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('mcq_sets')
    .delete()
    .eq('id', setId)
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    console.error('[supabase] deleteMcqSet failed:', error);
  }
}