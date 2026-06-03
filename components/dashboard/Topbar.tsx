'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  FileQuestion,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Trophy,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/upload', label: 'Upload', icon: Upload },
  { href: '/dashboard/mcq', label: 'MCQ', icon: FileQuestion },
  { href: '/dashboard/flashcards', label: 'Flashcards', icon: Layers },
  { href: '/dashboard/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/rewards', label: 'Rewards', icon: Trophy },
];

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center gap-6 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">Gamify</p>
            <p className="text-xs text-slate-500">Learning Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 overflow-x-auto">
          <div className="flex items-center justify-center gap-2">
            {navItems.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
