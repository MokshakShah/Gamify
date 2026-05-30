import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { getSupabaseConfigError } from '@/lib/supabase/config';
import { upsertClerkProfile } from '@/lib/supabase/sync-clerk-profile';

export const dynamic = 'force-dynamic';

/** Ensures the signed-in Clerk user exists in Supabase `profiles`. */
export async function POST() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    await upsertClerkProfile(user);
    return NextResponse.json({
      ok: true,
      clerkUserId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to sync profile.';
    console.error('[api/user/sync]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
