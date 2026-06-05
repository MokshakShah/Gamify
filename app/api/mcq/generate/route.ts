import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateMcqQuestions } from '@/lib/groq/generate-mcq';
import { createMcqSet, addMcqQuestions } from '@/lib/supabase/mcq';
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

  if (count > 15) {
    return NextResponse.json(
      { error: 'Maximum 15 MCQs can be generated at once' },
      { status: 400 }
    );
  }

  if (count < 1) {
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
    const questions = await generateMcqQuestions(topic.trim(), count, mcqContext);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate questions' },
        { status: 500 }
      );
    }

    // Create MCQ set in database
    const mcqSet = await createMcqSet(
      userId,
      generateSetTitle(topic, sourceType),
      topic.trim(),
      sourceType,
      sourceId
    );

    if (!mcqSet) {
      return NextResponse.json(
        { error: 'Failed to save MCQ set' },
        { status: 500 }
      );
    }

    // Add questions to database
    const dbQuestions = await addMcqQuestions(
      mcqSet.id,
      questions.map((q, index) => ({
        ...q,
        question_order: index + 1,
      }))
    );

    return NextResponse.json({
      mcqSet,
      questions: dbQuestions,
      message: `Generated ${questions.length} MCQs for "${topic}"`,
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