import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateMcqQuestions } from '@/lib/groq/generate-mcq';
import { createOrMergeMcqSet, addMcqQuestions } from '@/lib/supabase/mcq';
import { getYoutubeSummaryById } from '@/lib/supabase/youtube-summaries';

export const dynamic = 'force-dynamic';

type GenerateMcqRequest = {
  topic: string;
  count?: number;
  sourceType: 'topic' | 'pdf' | 'youtube';
  sourceId?: string;
  context?: string;
};

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: GenerateMcqRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { topic, count = 10, sourceType, sourceId, context } = body;

  if (!topic?.trim()) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
  }

  // For YouTube summaries, always generate 15 MCQs
  let finalCount = count;
  if (sourceType === 'youtube') {
    finalCount = 15;
    console.log('[MCQ Generation] YouTube source detected, generating 15 MCQs automatically');
  }

  if (finalCount > 15) {
    return NextResponse.json(
      { error: 'Maximum 15 MCQs can be generated at once' },
      { status: 400 }
    );
  }

  if (finalCount < 1) {
    return NextResponse.json(
      { error: 'At least 1 MCQ must be generated' },
      { status: 400 }
    );
  }

  try {
    // Get context if it's a YouTube summary
    let mcqContext = context;
    if (sourceType === 'youtube' && sourceId) {
      const summary = await getYoutubeSummaryById(userId, sourceId);
      if (summary?.summary) {
        mcqContext = summary.summary;
      }
    }

    // Generate MCQs
    const questions = await generateMcqQuestions(topic.trim(), finalCount, mcqContext);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate questions' },
        { status: 500 }
      );
    }

    // Create or merge MCQ set intelligently
    const result = await createOrMergeMcqSet(
      userId,
      generateSetTitle(topic, sourceType),
      topic.trim(),
      sourceType,
      sourceId
    );

    if (!result.mcqSet) {
      return NextResponse.json(
        { error: 'Failed to save MCQ set' },
        { status: 500 }
      );
    }

    // Add questions to database (with proper ordering for merged sets)
    const dbQuestions = await addMcqQuestions(
      result.mcqSet.id,
      questions.map((q) => ({
        ...q,
        // Let addMcqQuestions handle auto-ordering
      }))
    );

    // Return success response with merge context
    return NextResponse.json({
      mcqSet: result.mcqSet,
      questions: dbQuestions,
      isNew: result.isNew,
      merged: result.merged,
      message: result.merged 
        ? `Added ${questions.length} MCQs to existing "${result.mcqSet.title.replace(/\s*\((Video|PDF)\)$/, '')}" set`
        : `Created new MCQ set with ${questions.length} questions for "${topic}"`,
    });
  } catch (error) {
    console.error('MCQ generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

function generateSetTitle(topic: string, sourceType: string): string {
  const cleanTopic = topic.trim();
  
  switch (sourceType) {
    case 'pdf':
      return `${cleanTopic} MCQs (PDF)`;
    case 'youtube':
      return `${cleanTopic} MCQs (Video)`;
    default:
      return `${cleanTopic} MCQs`;
  }
}