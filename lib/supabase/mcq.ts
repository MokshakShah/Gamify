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

// Smart topic similarity matching
function calculateTopicSimilarity(topic1: string, topic2: string): number {
  const normalize = (str: string) => str.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const normalized1 = normalize(topic1);
  const normalized2 = normalize(topic2);

  // Exact match
  if (normalized1 === normalized2) return 1.0;

  // Check if one contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.8;
  }

  // Word-based similarity
  const words1 = new Set(normalized1.split(' '));
  const words2 = new Set(normalized2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  const similarity = intersection.size / union.size;
  return similarity;
}

export async function findSimilarMcqSet(
  clerkUserId: string,
  topic: string,
  sourceType: 'topic' | 'pdf' | 'youtube',
  similarityThreshold: number = 0.7
): Promise<McqSet | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  // Get all MCQ sets for the user
  const { data: mcqSets, error } = await supabase
    .from('mcq_sets')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('source_type', sourceType) // Only match same source type
    .order('created_at', { ascending: false });

  if (error || !mcqSets) {
    console.error('[supabase] findSimilarMcqSet failed:', error);
    return null;
  }

  // Find the most similar set
  let bestMatch: McqSet | null = null;
  let bestSimilarity = 0;

  for (const set of mcqSets) {
    const similarity = calculateTopicSimilarity(topic, set.topic);
    if (similarity >= similarityThreshold && similarity > bestSimilarity) {
      bestMatch = set;
      bestSimilarity = similarity;
    }
  }

  return bestMatch;
}

export async function createOrMergeMcqSet(
  clerkUserId: string,
  title: string,
  topic: string,
  sourceType: 'topic' | 'pdf' | 'youtube',
  sourceId?: string
): Promise<{ mcqSet: McqSet; isNew: boolean; merged?: boolean }> {
  // Try to find an existing similar set
  const existingSet = await findSimilarMcqSet(clerkUserId, topic, sourceType);

  if (existingSet) {
    console.log(`Found similar MCQ set: "${existingSet.topic}" matches "${topic}"`);
    
    // Update the existing set's updated_at timestamp
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase
        .from('mcq_sets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existingSet.id);
    }

    return {
      mcqSet: existingSet,
      isNew: false,
      merged: true
    };
  }

  // No similar set found, create a new one
  const newSet = await createMcqSet(clerkUserId, title, topic, sourceType, sourceId);
  
  if (!newSet) {
    throw new Error('Failed to create MCQ set');
  }

  return {
    mcqSet: newSet,
    isNew: true,
    merged: false
  };
}

export async function getNextQuestionOrder(mcqSetId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 1;

  const { data, error } = await supabase
    .from('mcq_questions')
    .select('question_order')
    .eq('mcq_set_id', mcqSetId)
    .order('question_order', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return 1;
  }

  return data[0].question_order + 1;
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
    question_order?: number; // Make optional for auto-ordering
  }>
): Promise<McqQuestion[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  // Get the next question order number if not provided
  let nextOrder = await getNextQuestionOrder(mcqSetId);

  const questionsWithOrder = questions.map((q, index) => ({
    mcq_set_id: mcqSetId,
    ...q,
    question_order: q.question_order ?? (nextOrder + index)
  }));

  const { data, error } = await supabase
    .from('mcq_questions')
    .insert(questionsWithOrder)
    .select();

  if (error) {
    console.error('[supabase] addMcqQuestions failed:', error);
    return [];
  }

  return data ?? [];
}

export async function updateMcqSetTitle(
  clerkUserId: string,
  setId: string,
  newTitle: string
): Promise<McqSet | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('mcq_sets')
    .update({ 
      title: newTitle,
      updated_at: new Date().toISOString()
    })
    .eq('id', setId)
    .eq('clerk_user_id', clerkUserId)
    .select()
    .single();

  if (error) {
    console.error('[supabase] updateMcqSetTitle failed:', error);
    return null;
  }

  return data;
}

export async function updateMcqSetTopic(
  clerkUserId: string,
  setId: string,
  newTopic: string
): Promise<McqSet | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('mcq_sets')
    .update({
      topic: newTopic,
      updated_at: new Date().toISOString()
    })
    .eq('id', setId)
    .eq('clerk_user_id', clerkUserId)
    .select()
    .single();

  if (error) {
    console.error('[supabase] updateMcqSetTopic failed:', error);
    return null;
  }

  return data;
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