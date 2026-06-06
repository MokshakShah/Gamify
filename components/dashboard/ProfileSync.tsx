'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { upsertClerkProfile } from '@/lib/supabase/sync-clerk-profile';

export function ProfileSync() {
  const { isLoaded: authLoaded, userId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const syncedRef = useRef(false);

  useEffect(() => {
    // Only sync once per session and don't block navigation
    if (!authLoaded || !userLoaded || !userId || !user || syncedRef.current) {
      return;
    }

    syncedRef.current = true;
    
    // Run profile sync in background without blocking
    const syncProfile = async () => {
      try {
        await upsertClerkProfile(user);
      } catch (error) {
        console.error('[ProfileSync] Profile sync failed:', error);
        // Allow retry on next navigation
        syncedRef.current = false;
      }
    };

    // Use setTimeout to ensure this doesn't block initial render
    setTimeout(syncProfile, 0);
  }, [authLoaded, userLoaded, userId, user]);

  return null;
}
