'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { chatDashboardPath } from '@/lib/chat/urls';

/** Opens the latest chat or creates a new one, then redirects to /dashboard/chat/[chatId]. */
export default function ChatIndexPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;

    let cancelled = false;

    const go = async () => {
      const listRes = await fetch('/api/chat/threads');
      if (cancelled) return;

      if (listRes.ok) {
        const data = (await listRes.json()) as {
          threads: Array<{ chatId: string }>;
        };
        const first = data.threads[0]?.chatId;
        if (first) {
          router.replace(chatDashboardPath(first));
          return;
        }
      }

      const createRes = await fetch('/api/chat/threads', { method: 'POST' });
      if (cancelled || !createRes.ok) return;
      const created = (await createRes.json()) as {
        thread: { chatId: string };
      };
      router.replace(chatDashboardPath(created.thread.chatId));
    };

    void go();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && !isSignedIn) {
    return (
      <p className="p-8 text-sm text-slate-600">Sign in to use AI Chat.</p>
    );
  }

  return (
    <p className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      Loading chat…
    </p>
  );
}
