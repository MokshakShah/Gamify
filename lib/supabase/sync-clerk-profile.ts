import type { User } from '@clerk/backend';

import { getSupabaseAdmin } from '@/lib/supabase/admin';

function primaryEmail(user: User): string | null {
  const primaryId = user.primaryEmailAddressId;
  if (primaryId) {
    const match = user.emailAddresses.find((e) => e.id === primaryId);
    if (match) return match.emailAddress;
  }
  return user.emailAddresses[0]?.emailAddress ?? null;
}

/**
 * Upserts the signed-in Clerk user into `public.profiles` (see supabase SQL).
 * Safe to call on every dashboard load; uses onConflict update.
 */
export async function upsertClerkProfile(user: User): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[gamify] Supabase env missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY); skipping profile sync.'
      );
    }
    return;
  }

  const row = {
    clerk_user_id: user.id,
    email: primaryEmail(user),
    first_name: user.firstName,
    last_name: user.lastName,
    image_url: user.imageUrl,
    username: user.username,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(row, {
    onConflict: 'clerk_user_id',
  });

  if (error) {
    console.error('[gamify] Supabase profile upsert failed:', error.message);
    throw error;
  }
}
