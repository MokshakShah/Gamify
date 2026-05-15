'use client';

import { ArrowRight, Play, Sparkles, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8 },
  },
};

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

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 overflow-hidden dark:bg-black bg-white">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        {/* Gradient orbs - Blue only */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 dark:opacity-20 animate-pulse" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 dark:opacity-15 animate-pulse" />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 dark:opacity-10 animate-pulse" />
      </div>

      {/* Content */}
      <motion.div
        className="max-w-5xl mx-auto text-center relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-white/10 backdrop-blur-xl border border-white/20 dark:border-white/20 rounded-full px-6 py-3 hover:bg-white/20 dark:hover:bg-white/20 transition">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-900 dark:text-white text-sm font-semibold">AI-Powered Learning Platform</span>
          </div>
        </motion.div>

        {/* Main Heading */}
        <motion.h1 variants={itemVariants} className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          <span className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
            Study Smarter,
          </span>
          <br />
          <span className="text-gray-900 dark:text-white">
            Learn Faster
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p variants={itemVariants} className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
          Transform your lectures, PDFs, and videos into interactive learning materials with AI-powered summaries, quizzes, and smart tutoring.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 group">
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" />
          </Button>
          <Button size="lg" variant="glass">
            <Play className="w-5 h-5 mr-2" />
            Watch Demo
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
