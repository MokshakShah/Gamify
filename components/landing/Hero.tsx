'use client';

import {
  ArrowRight,
  Sparkles,
  Moon,
  Sun,
  FileText,
  Video,
  Mic,
  Zap,
  Trophy,
  Brain,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import styles from './hero-grid.module.css';

// ─── Interactive 3D Grid Background ────────────────────────────────────────────
const GRID_SIZE = 20; // Reduced from 40 (1600 tiles → 400 tiles)
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const BASE_TRANSFORM = 'translate(-50%, -50%) perspective(500px) rotateX(60deg)';

interface InteractiveGridProps {
  sectionRef: React.RefObject<HTMLElement | null>;
  hoverColors?: string | [string, string, string, string];
}

function InteractiveGrid({ sectionRef, hoverColors }: InteractiveGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const lastTileRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<PointerEvent | null>(null);

  useEffect(() => {
    if (initialized.current || !gridRef.current || !tileRef.current) return;
    initialized.current = true;

    const fragment = document.createDocumentFragment();
    for (let i = 1; i < TOTAL_TILES; i++) {
      fragment.appendChild(tileRef.current.cloneNode(true));
    }
    gridRef.current.appendChild(fragment);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const grid = gridRef.current;
    if (!section || !grid) return;

    const findTileAt = (x: number, y: number): HTMLDivElement | null => {
      const elements = document.elementsFromPoint(x, y);
      for (const el of elements) {
        if (el.classList.contains(styles.tile)) {
          return el as HTMLDivElement;
        }
      }
      return null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      pendingPointerRef.current = e;
      if (rafRef.current !== null) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const event = pendingPointerRef.current;
        pendingPointerRef.current = null;
        if (!event) return;

        const rect = section.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / rect.width - 0.5;
        const ny = (event.clientY - rect.top) / rect.height - 0.5;

        grid.style.transform = `${BASE_TRANSFORM} rotateX(${60 + ny * 6}deg) rotateY(${nx * -6}deg)`;

        const tile = findTileAt(event.clientX, event.clientY);
        if (tile === lastTileRef.current) return;

        if (lastTileRef.current) {
          lastTileRef.current.classList.remove(styles.tileActive);
        }

        if (tile) {
          tile.classList.add(styles.tileActive);
        }

        lastTileRef.current = tile;
      });
    };

    const handlePointerLeave = () => {
      grid.style.transform = BASE_TRANSFORM;
      if (lastTileRef.current) {
        lastTileRef.current.classList.remove(styles.tileActive);
        lastTileRef.current = null;
      }
    };

    section.addEventListener('pointermove', handlePointerMove);
    section.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      section.removeEventListener('pointermove', handlePointerMove);
      section.removeEventListener('pointerleave', handlePointerLeave);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [sectionRef]);

  const style = hoverColors
    ? ({
        '--hero-grid-hover-color-1': Array.isArray(hoverColors) ? hoverColors[0] : hoverColors,
        '--hero-grid-hover-color-2': Array.isArray(hoverColors) ? (hoverColors[1] ?? hoverColors[0]) : hoverColors,
        '--hero-grid-hover-color-3': Array.isArray(hoverColors) ? (hoverColors[2] ?? hoverColors[0]) : hoverColors,
        '--hero-grid-hover-color-4': Array.isArray(hoverColors) ? (hoverColors[3] ?? hoverColors[0]) : hoverColors,
      } as React.CSSProperties)
    : undefined;

  return (
    <div aria-hidden="true" className={styles.gridContainer} style={style}>
      <div className={styles.mainGrid} ref={gridRef}>
        <div className={styles.tile} ref={tileRef} />
      </div>
    </div>
  );
}

// ─── Floating product preview cards ──────────────────────────────────────────────
function HeroPreview() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:max-w-none h-[340px] sm:h-[380px] pointer-events-none">
      {/* Main dashboard card */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
        className="absolute inset-x-4 top-4 rounded-2xl border border-white/50 dark:border-white/15 bg-white/80 dark:bg-white/10 backdrop-blur-xl shadow-2xl shadow-blue-500/10 p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900 dark:text-white">Biology Lecture</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Summary generated · 2 min ago</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-gray-200/80 dark:bg-white/10 w-full" />
          <div className="h-2 rounded-full bg-gray-200/80 dark:bg-white/10 w-[85%]" />
          <div className="h-2 rounded-full bg-gray-200/80 dark:bg-white/10 w-[70%]" />
        </div>
        <div className="mt-4 flex gap-2">
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
            12 key concepts
          </span>
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            Quiz ready
          </span>
        </div>
      </motion.div>

      {/* Quiz card */}
      <motion.div
        initial={{ opacity: 0, x: 40, y: 20 }}
        animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.7 },
          x: { duration: 0.6, delay: 0.7 },
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 },
        }}
        className="absolute -right-2 sm:right-0 top-28 w-44 rounded-xl border border-white/50 dark:border-white/15 bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl p-3.5"
      >
        <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1">MCQ</p>
        <p className="text-xs font-medium text-gray-900 dark:text-white leading-snug mb-3">
          What is the powerhouse of the cell?
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md bg-gray-50 dark:bg-white/5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            Mitochondria
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-500 px-2 py-1">Nucleus</div>
        </div>
      </motion.div>

      {/* Streak badge */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: 10 }}
        animate={{ opacity: 1, x: 0, y: [0, 5, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.85 },
          x: { duration: 0.6, delay: 0.85 },
          y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
        }}
        className="absolute -left-2 sm:left-0 bottom-16 flex items-center gap-2 rounded-full border border-white/50 dark:border-white/15 bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg px-3 py-2"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Trophy className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-900 dark:text-white">7-day streak</p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400">+120 XP today</p>
        </div>
      </motion.div>

      {/* Flashcard chip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: [0, -4, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 1 },
          y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 },
        }}
        className="absolute right-8 bottom-4 flex items-center gap-1.5 rounded-lg border border-white/50 dark:border-white/15 bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg px-3 py-2"
      >
        <Zap className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-[10px] font-semibold text-gray-900 dark:text-white">24 flashcards</span>
      </motion.div>
    </div>
  );
}

const SOURCE_FORMATS = [
  { icon: FileText, label: 'PDFs' },
  { icon: Video, label: 'YouTube' },
  { icon: Mic, label: 'Audio' },
  { icon: FileText, label: 'Slides' },
];

// ─── Animation Variants ────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const blurSlideVariants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  },
} as const;

// ─── Theme Toggle ──────────────────────────────────────────────────────────────
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="fixed top-20 right-4 sm:right-6 lg:right-8 z-50 p-2 rounded-lg bg-white/10 dark:bg-white/10 backdrop-blur-xl border border-white/20 dark:border-white/20 hover:bg-white/20 dark:hover:bg-white/20 transition"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-white" />
      ) : (
        <Moon className="w-5 h-5 text-gray-900" />
      )}
    </button>
  );
}

// ─── Hero Section ──────────────────────────────────────────────────────────────
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const router = useRouter();

  const ctaButton = (
    <Button
      size="lg"
      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 group shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all text-base px-8"
    >
      Get Started Free
      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" />
    </Button>
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center px-4 sm:px-6 lg:px-8 pt-24 pb-16 overflow-hidden dark:bg-black bg-white"
    >
      <InteractiveGrid
        sectionRef={sectionRef}
        hoverColors={['#3b82f6', '#60a5fa', '#2563eb', '#93c5fd']}
      />

      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute top-16 -left-20 w-[500px] h-[500px] bg-blue-400/25 dark:bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-400/15 dark:bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left — copy */}
          <motion.div
            className="text-center lg:text-left pointer-events-none"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={blurSlideVariants} className="mb-6">
              <div className="inline-flex items-center gap-2 bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-blue-200/60 dark:border-white/20 rounded-full px-4 py-2 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-gray-900 dark:text-white text-sm font-medium">
                  AI-Powered Learning Platform
                </span>
              </div>
            </motion.div>

            <motion.h1
              variants={blurSlideVariants}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-5 leading-[1.1] tracking-tight"
            >
              <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-violet-500 dark:from-blue-400 dark:via-blue-300 dark:to-violet-400 bg-clip-text text-transparent">
                Study Smarter,
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">Learn Faster</span>
            </motion.h1>

            <motion.p
              variants={blurSlideVariants}
              className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed"
            >
              Drop in a lecture, PDF, or video — Gamify turns it into summaries,
              quizzes, flashcards, and an AI tutor that actually knows your material.
            </motion.p>

            <motion.div
              variants={blurSlideVariants}
              className="flex flex-wrap gap-2 justify-center lg:justify-start mb-8"
            >
              {SOURCE_FORMATS.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200/80 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-300"
                >
                  <Icon className="w-3.5 h-3.5 text-blue-500" />
                  {label}
                </span>
              ))}
            </motion.div>

            <motion.div
              variants={blurSlideVariants}
              className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pointer-events-auto"
            >
              <SignedOut>
                <SignUpButton>{ctaButton}</SignUpButton>
              </SignedOut>
              <SignedIn>
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 group shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all text-base px-8"
                  onClick={() => router.push('/dashboard')}
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" />
                </Button>
              </SignedIn>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Free to start · No credit card
              </p>
            </motion.div>
          </motion.div>

          {/* Right — product preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="hidden sm:block"
          >
            <HeroPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
