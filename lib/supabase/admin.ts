import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminConfig } from '@/lib/supabase/config';

let admin: SupabaseClient | null = null;
let adminConfigKey: string | null = null;

/**
 * Server-only Supabase client with the service role key.
 * Never import this from client components.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const config = getSupabaseAdminConfig();
  if (!config) return null;

  const cacheKey = `${config.url}:${config.serviceRoleKey.slice(0, 8)}`;
  if (admin && adminConfigKey === cacheKey) {
    return admin;
  }

  admin = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  adminConfigKey = cacheKey;
  return admin;
}
