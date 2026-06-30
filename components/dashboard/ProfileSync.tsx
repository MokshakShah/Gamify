'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

export function ProfileSync() {
  const { isLoaded: authLoaded, userId } = useAuth();
  const syncedRef = useRef(false);

  useEffect(() => {
    // Only sync once per session and don't block navigation
    if (!authLoaded || !userId || syncedRef.current) {
      return;
    }

    syncedRef.current = true;

    // Run profile sync in background without blocking
    const syncProfile = async () => {
      try {
        const response = await fetch('/api/user/sync', { method: 'POST' });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? `Profile sync failed (${response.status})`);
        }
      } catch (error) {
        console.error('[ProfileSync] Profile sync failed:', error);
        // Allow retry on next navigation
        syncedRef.current = false;
      }
    };

    // Use setTimeout to ensure this doesn't block initial render
    setTimeout(syncProfile, 0);
  }, [authLoaded, userId]);

  return null;
}
