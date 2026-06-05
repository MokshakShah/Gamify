import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getMcqSetWithQuestions, deleteMcqSet } from '@/lib/supabase/mcq';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { setId: string } };

export async function GET(req: Request, { params }: RouteContext) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { setId } = params;

  try {
    const mcqSet = await getMcqSetWithQuestions(userId, setId);
    
    if (!mcqSet) {
      return NextResponse.json({ error: 'MCQ set not found' }, { status: 404 });
    }

    return NextResponse.json({ mcqSet });
  } catch (error) {
    console.error('Failed to fetch MCQ set:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCQ set' },
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
    return NextResponse.json({ message: 'MCQ set deleted successfully' });
  } catch (error) {
    console.error('Failed to delete MCQ set:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCQ set' },
      { status: 500 }
    );
  }
}