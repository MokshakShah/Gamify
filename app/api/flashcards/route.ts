import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listFlashcardsForUser, getFlashcardStats } from '@/lib/supabase/flashcards';
import { cacheHelpers } from '@/lib/cache/api-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Try server-side cache first
    const cachedFlashcards = cacheHelpers.getFlashcards(userId);
    if (cachedFlashcards) {
      console.log('Flashcards served from server cache');
      return NextResponse.json(cachedFlashcards);
    }

    // If not in cache, fetch from database
    console.log('Flashcards not in server cache, fetching from database');
    const [flashcards, stats] = await Promise.all([
      listFlashcardsForUser(userId),
      getFlashcardStats(userId)
    ]);

    const result = { flashcards, stats };
    
    // Cache the result
    cacheHelpers.setFlashcards(userId, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flashcards' },
      { status: 500 }
    );
  }
}