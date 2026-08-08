import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getMcqSetWithQuestions, deleteMcqSet, updateMcqSetTitle, updateMcqSetTopic } from '@/lib/supabase/mcq';
import { cacheHelpers } from '@/lib/cache/api-cache';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { setId: string } };

export async function GET(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { setId } = params;

  try {
    // Try server-side cache first
    const cachedMcqSet = cacheHelpers.getMcqSet(userId, setId);
    if (cachedMcqSet) {
      console.log(`MCQ set ${setId} served from server cache`);
      return NextResponse.json({ mcqSet: cachedMcqSet });
    }

    // If not in cache, fetch from database
    console.log(`MCQ set ${setId} not in server cache, fetching from database`);
    const mcqSet = await getMcqSetWithQuestions(userId, setId);
    
    if (!mcqSet) {
      return NextResponse.json({ error: 'MCQ set not found' }, { status: 404 });
    }

    // Cache the result
    cacheHelpers.setMcqSet(userId, setId, mcqSet);

    return NextResponse.json({ mcqSet });
  } catch (error) {
    console.error('Failed to fetch MCQ set:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCQ set' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { setId } = params;

  try {
    const body = await req.json();
    const { title, topic } = body;

    // Update topic if provided
    if (topic !== undefined) {
      if (typeof topic !== 'string' || topic.trim().length === 0) {
        return NextResponse.json({ error: 'Topic must be a non-empty string' }, { status: 400 });
      }
      if (topic.trim().length > 100) {
        return NextResponse.json({ error: 'Topic must be 100 characters or less' }, { status: 400 });
      }
      const updatedSet = await updateMcqSetTopic(userId, setId, topic.trim());
      if (!updatedSet) {
        return NextResponse.json({ error: 'MCQ set not found or update failed' }, { status: 404 });
      }
      cacheHelpers.invalidateMcqSet(userId, setId);
      cacheHelpers.invalidateMcqSets(userId);
      return NextResponse.json({ mcqSet: updatedSet });
    }

    // Update title if provided
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (title.trim().length > 100) {
      return NextResponse.json({ error: 'Title must be 100 characters or less' }, { status: 400 });
    }

    const updatedSet = await updateMcqSetTitle(userId, setId, title.trim());
    
    if (!updatedSet) {
      return NextResponse.json({ error: 'MCQ set not found or update failed' }, { status: 404 });
    }

    // Invalidate cache for this specific set and the sets list
    cacheHelpers.invalidateMcqSet(userId, setId);
    cacheHelpers.invalidateMcqSets(userId);

    return NextResponse.json({ mcqSet: updatedSet });
  } catch (error) {
    console.error('Failed to update MCQ set title:', error);
    return NextResponse.json(
      { error: 'Failed to update MCQ set title' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { setId } = params;

  try {
    await deleteMcqSet(userId, setId);
    
    // Invalidate cache for this specific set and the sets list
    cacheHelpers.invalidateMcqSet(userId, setId);
    cacheHelpers.invalidateMcqSets(userId);

    return NextResponse.json({ message: 'MCQ set deleted successfully' });
  } catch (error) {
    console.error('Failed to delete MCQ set:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCQ set' },
      { status: 500 }
    );
  }
}