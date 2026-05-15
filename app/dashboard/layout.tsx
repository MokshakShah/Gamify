import type { Metadata } from 'next';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Topbar } from '@/components/dashboard/Topbar';
import { upsertClerkProfile } from '@/lib/supabase/sync-clerk-profile';

export const metadata: Metadata = {
  title: 'Dashboard - Gamify',
};

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();
  if (userId) {
    const user = await currentUser();
    if (user) {
      try {
        await upsertClerkProfile(user);
      } catch {
        // Logged in sync-clerk-profile; avoid breaking the dashboard if Supabase is misconfigured.
      }
    }
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-900">
      <Topbar />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
