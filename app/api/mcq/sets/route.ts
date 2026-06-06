import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listMcqSetsForUser } from '@/lib/supabase/mcq';
import { cacheHelpers } from '@/lib/cache/api-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Try server-side cache first
    const cachedMcqSets = cacheHelpers.getMcqSets(userId);
    if (cachedMcqSets) {
      console.log('MCQ sets served from server cache');
      return NextResponse.json({ mcqSets: cachedMcqSets });
    }

    // If not in cache, fetch from database
    console.log('MCQ sets not in server cache, fetching from database');
    const mcqSets = await listMcqSetsForUser(userId);
    
    // Cache the result
    cacheHelpers.setMcqSets(userId, mcqSets);
    
    return NextResponse.json({ mcqSets });
  } catch (error) {
    console.error('Failed to fetch MCQ sets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCQ sets' },
      { status: 500 }
    );
  }
}