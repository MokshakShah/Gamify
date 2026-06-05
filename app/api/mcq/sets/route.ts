import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listMcqSetsForUser } from '@/lib/supabase/mcq';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const mcqSets = await listMcqSetsForUser(userId);
    return NextResponse.json({ mcqSets });
  } catch (error) {
    console.error('Failed to fetch MCQ sets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCQ sets' },
      { status: 500 }
    );
  }
}