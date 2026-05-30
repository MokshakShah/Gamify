import type { User } from '@clerk/backend';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSupabaseConfigError } from '@/lib/supabase/config';

export type ProfileRow = {
  clerk_user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  username: string | null;
  updated_at: string;
};

/** Clerk webhook `data` payload (user.* events). */
export type ClerkWebhookUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  username?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{ id: string; email_address: string }>;
};

function primaryEmailFromWebhook(user: ClerkWebhookUser): string | null {
  const primaryId = user.primary_email_address_id;
  if (primaryId && user.email_addresses) {
    const match = user.email_addresses.find((e) => e.id === primaryId);
    if (match) return match.email_address;
  }
  return user.email_addresses?.[0]?.email_address ?? null;
}

function primaryEmailFromUser(user: User): string | null {
  const primaryId = user.primaryEmailAddressId;
  if (primaryId) {
    const match = user.emailAddresses.find((e) => e.id === primaryId);
    if (match) return match.emailAddress;
  }
  return user.emailAddresses[0]?.emailAddress ?? null;
}

export function profileRowFromClerkUser(user: User): ProfileRow {
  return {
    clerk_user_id: user.id,
    email: primaryEmailFromUser(user),
    first_name: user.firstName,
    last_name: user.lastName,
    image_url: user.imageUrl,
    username: user.username,
    updated_at: new Date().toISOString(),
  };
}

export function profileRowFromWebhookUser(user: ClerkWebhookUser): ProfileRow {
  return {
    clerk_user_id: user.id,
    email: primaryEmailFromWebhook(user),
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    image_url: user.image_url ?? null,
    username: user.username ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertProfileRow(row: ProfileRow): Promise<void> {
  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase admin client could not be created.');
  }

  const { error } = await supabase.from('profiles').upsert(row, {
    onConflict: 'clerk_user_id',
  });

  if (error) {
    console.error('[gamify] Supabase profile upsert failed:', error.message, error);
    throw new Error(`Profile sync failed: ${error.message}`);
  }
}

/**
 * Upserts the signed-in Clerk user into `public.profiles`.
 * Safe to call on every dashboard load; uses onConflict update.
 */
export async function upsertClerkProfile(user: User): Promise<void> {
  await upsertProfileRow(profileRowFromClerkUser(user));
}

export async function upsertClerkProfileFromWebhook(
  user: ClerkWebhookUser
): Promise<void> {
  await upsertProfileRow(profileRowFromWebhookUser(user));
}

export async function deleteClerkProfile(clerkUserId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    console.error('[gamify] profile delete failed:', error.message);
    throw error;
  }
}
