'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function CTAButton() {
  const router = useRouter();

  return (
    <>
      <SignedOut>
        <SignUpButton>
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 group"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <Button
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 group"
          onClick={() => router.push('/dashboard')}
        >
          Go to Dashboard
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </SignedIn>
    </>
  );
}
