import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardAuthGate } from '@/components/dashboard/DashboardAuthGate';
import { ProfileSync } from '@/components/dashboard/ProfileSync';
import { Topbar } from '@/components/dashboard/Topbar';

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
  if (!userId) {
    redirect('/');
  }

  // Remove blocking operations - ProfileSync will handle user sync in client
  return (
    <DashboardAuthGate>
      <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-900">
        <ProfileSync />
        <Topbar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain p-6 md:p-8">
          {children}
        </main>
      </div>
    </DashboardAuthGate>
  );
}
