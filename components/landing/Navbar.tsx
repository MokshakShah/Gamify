'use client';

import { BookOpen, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  SignInButton,
  SignedIn,
  SignedOut,
} from '@clerk/nextjs';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#benefits', label: 'Benefits' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 z-40 w-full"
    >
      {/* Glassmorphic navbar with refined blur */}
      <div className="mx-4 mt-3 sm:mx-6 lg:mx-8 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-lg shadow-black/[0.03] dark:shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-shadow">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Gamify
              </span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-white/40 dark:hover:bg-white/5"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-2">
              <SignedOut>
                <SignInButton>
                  <Button variant="glass" size="sm" className="text-sm">
                    Sign In
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <a
                  href="/dashboard"
                  className={buttonVariants({ variant: 'default', size: 'sm', className: 'text-sm' })}
                >
                  Dashboard
                </a>
              </SignedIn>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                className="p-2 text-gray-900 dark:text-white hover:bg-white/40 dark:hover:bg-white/10 rounded-lg transition"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="md:hidden overflow-hidden border-t border-white/20 dark:border-white/10"
            >
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 py-2 px-3 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 transition text-sm font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-2 pb-1">
                  <SignedOut>
                    <SignInButton>
                      <Button variant="glass" size="sm" className="w-full text-sm">
                        Sign In
                      </Button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <a
                      href="/dashboard"
                      className={buttonVariants({
                        variant: 'default',
                        size: 'sm',
                        className: 'w-full text-sm',
                      })}
                    >
                      Dashboard
                    </a>
                  </SignedIn>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
