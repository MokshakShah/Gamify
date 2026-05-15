'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useClerk, useUser } from '@clerk/nextjs';

export default function DisposableEmailBlockedPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || signingOut) return;
    setSigningOut(true);
    void signOut().then(() => {
      window.location.assign('/sign-in?blocked=disposable_email');
    });
  }, [isLoaded, isSignedIn, signOut, signingOut]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900">
        This email isn&apos;t allowed
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-600">
        Temporary or disposable addresses can&apos;t be used with Gamify.
        Please sign in with a stable email (school, work, or a personal Gmail
        / Outlook / etc.).
      </p>
      {signingOut ? (
        <p className="text-sm text-slate-500">Signing you out…</p>
      ) : !isSignedIn ? (
        <Link
          href="/sign-in"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Back to sign in
        </Link>
      ) : null}
    </div>
  );
}
