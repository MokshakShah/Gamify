import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { addToFlashcards, removeFromFlashcards, isQuestionInFlashcards } from '@/lib/supabase/flashcards';
import { cacheHelpers } from '@/lib/cache/api-cache';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { questionId: string } };

export async function GET(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questionId } = params;

  try {
    // Try server-side cache first
    const cachedStatus = cacheHelpers.getFlashcardStatus(userId, questionId);
    if (cachedStatus !== null && cachedStatus !== undefined) {
      console.log(`Flashcard status for ${questionId} served from server cache`);
      return NextResponse.json({ isInFlashcards: cachedStatus.isInFlashcards });
    }

    // If not in cache, fetch from database
    console.log(`Flashcard status for ${questionId} not in server cache, fetching from database`);
    const isInFlashcards = await isQuestionInFlashcards(userId, questionId);
    
    const result = { isInFlashcards };
    
    // Cache the result
    cacheHelpers.setFlashcardStatus(userId, questionId, result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to check flashcard status:', error);
    return NextResponse.json(
      { error: 'Failed to check flashcard status' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questionId } = params;

  try {
    const flashcard = await addToFlashcards(userId, questionId);
    
    // Invalidate related cache
    cacheHelpers.invalidateFlashcardStatus(userId, questionId);
    cacheHelpers.invalidateFlashcards(userId);
    
    return NextResponse.json({ 
      success: true, 
      flashcard,
      message: 'Added to flashcards' 
    });
  } catch (error) {
    console.error('Failed to add to flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to add to flashcards' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questionId } = params;

  try {
    await removeFromFlashcards(userId, questionId);
    
    // Invalidate related cache
    cacheHelpers.invalidateFlashcardStatus(userId, questionId);
    cacheHelpers.invalidateFlashcards(userId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Removed from flashcards' 
    });
  } catch (error) {
    console.error('Failed to remove from flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to remove from flashcards' },
      { status: 500 }
    );
  }
}