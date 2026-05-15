'use client';

import { BookOpen, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  SignInButton,
  SignedIn,
  SignedOut,
} from '@clerk/nextjs';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-40 w-full bg-white/30 backdrop-blur-xl border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Gamify
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-gray-700 hover:text-blue-600 transition relative group"
            >
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-500 group-hover:w-full transition-all duration-300" />
            </a>
            <a
              href="#how-it-works"
              className="text-gray-700 hover:text-blue-600 transition relative group"
            >
              How It Works
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-500 group-hover:w-full transition-all duration-300" />
            </a>
            <a
              href="#benefits"
              className="text-gray-700 hover:text-blue-600 transition relative group"
            >
              Benefits
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-500 group-hover:w-full transition-all duration-300" />
            </a>
            <div className="flex items-center gap-2">
              <SignedOut>
                <SignInButton>
                  <Button variant="glass" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <a
                  href="/dashboard"
                  className={buttonVariants({ variant: 'default', size: 'sm' })}
                >
                  Dashboard
                </a>
              </SignedIn>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              className="text-gray-900 hover:text-gray-700 transition"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 bg-white border-t border-gray-200">
            <a
              href="#features"
              className="block text-gray-700 hover:text-blue-600 py-2 px-4 rounded transition"
              onClick={() => setIsOpen(false)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="block text-gray-700 hover:text-blue-600 py-2 px-4 rounded transition"
              onClick={() => setIsOpen(false)}
            >
              How It Works
            </a>
            <a
              href="#benefits"
              className="block text-gray-700 hover:text-blue-600 py-2 px-4 rounded transition"
              onClick={() => setIsOpen(false)}
            >
              Benefits
            </a>
            <div className="px-4 pt-2">
              <SignedOut>
                <SignInButton>
                  <Button variant="glass" size="sm" className="w-full">
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
                    className: 'w-full',
                  })}
                >
                  Dashboard
                </a>
              </SignedIn>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
