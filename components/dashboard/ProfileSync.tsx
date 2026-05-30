'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

const MAX_ATTEMPTS = 3;

/**
 * Mirrors the signed-in Clerk user to Supabase `profiles` via /api/user/sync.
 * Retries on failure; resets when the user signs out so the next login syncs again.
 */
export function ProfileSync() {
  const { isLoaded, isSignedIn } = useAuth();
  const synced = useRef(false);
  const attempts = useRef(0);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      synced.current = false;
      attempts.current = 0;
      return;
    }

    if (synced.current) return;

    let cancelled = false;

    const runSync = async () => {
      if (cancelled || synced.current) return;
      if (attempts.current >= MAX_ATTEMPTS) return;

      attempts.current += 1;

      const res = await fetch('/api/user/sync', { method: 'POST' });
      if (cancelled) return;

      if (res.ok) {
        synced.current = true;
        return;
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      console.error(
        '[ProfileSync]',
        body.error ?? `Sync failed (${res.status})`
      );

      if (attempts.current < MAX_ATTEMPTS && !cancelled) {
        window.setTimeout(() => void runSync(), 2000);
      }
    };

    void runSync();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return null;
}
