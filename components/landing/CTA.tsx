'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export default function CTA() {
  const router = useRouter();

  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden dark:bg-black bg-white">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br dark:from-blue-600/20 dark:via-blue-600/10 dark:to-transparent from-blue-500/10 via-blue-500/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 dark:opacity-15 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-10 animate-pulse" />
      </div>

      {/* Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto relative z-10 p-12 sm:p-16 rounded-3xl dark:border-white/20 border-gray-200 dark:backdrop-blur-2xl dark:bg-white/10 bg-white dark:hover:border-white/30 hover:border-blue-300 transition shadow-lg dark:shadow-blue-500/10"
      >
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Ready to Transform Your Learning?
        </h2>
        <p className="text-lg text-gray-700 dark:text-gray-200 mb-12 max-w-2xl mx-auto text-center leading-relaxed">
          Join thousands of students learning smarter. Start free today, no credit card required.
        </p>
        <div className="flex justify-center">
          <SignedOut>
            <SignUpButton>
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 group"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" />
              </Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 group"
              onClick={() => router.push('/dashboard')}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" />
            </Button>
          </SignedIn>
        </div>
      </motion.div>
    </section>
  );
}
