'use client';

import { Upload, Wand2, BarChart, Lightbulb } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    icon: Upload,
    title: 'Upload',
    description: 'Drop a YouTube link, PDF, or lecture recording and you\'re ready to go.',
    color: 'from-blue-500 to-blue-600',
    glow: 'shadow-blue-500/30',
    dot: 'bg-blue-500',
  },
  {
    icon: Wand2,
    title: 'Process',
    description: 'AI reads, listens, and extracts every key concept from your content.',
    color: 'from-violet-500 to-violet-600',
    glow: 'shadow-violet-500/30',
    dot: 'bg-violet-500',
  },
  {
    icon: BarChart,
    title: 'Generate',
    description: 'Summaries, quizzes, and flashcards are built automatically — no manual work.',
    color: 'from-indigo-500 to-indigo-600',
    glow: 'shadow-indigo-500/30',
    dot: 'bg-indigo-500',
  },
  {
    icon: Lightbulb,
    title: 'Learn',
    description: 'Study smarter with interactive content designed around your material.',
    color: 'from-sky-500 to-sky-600',
    glow: 'shadow-sky-500/30',
    dot: 'bg-sky-500',
  },
];

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export default function HowItWorks() {
  const { ref, inView } = useInView(0.15);

  return (
    <section
      id="how-it-works"
      className="relative py-24 sm:py-36 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-black/30 overflow-hidden"
    >
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.07]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl opacity-[0.07]" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-violet-500 bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400">
            Four steps from raw content to exam-ready knowledge
          </p>
        </div>

        {/* Timeline */}
        <div ref={ref} className="relative">

          {/* Horizontal track line (desktop) */}
          <div className="hidden lg:block absolute top-[2.6rem] left-[calc(12.5%-1px)] right-[calc(12.5%-1px)] h-[2px] bg-gray-200 dark:bg-white/10" />

          {/* Animated fill on the track */}
          <div
            className="hidden lg:block absolute top-[2.6rem] left-[calc(12.5%-1px)] h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 to-sky-500 transition-all duration-[1400ms] ease-out"
            style={{ width: inView ? 'calc(75% + 2px)' : '0%' }}
          />

          {/* Vertical track (mobile) */}
          <div className="lg:hidden absolute left-5 top-5 bottom-5 w-[2px] bg-gray-200 dark:bg-white/10" />
          <div
            className="lg:hidden absolute left-5 top-5 w-[2px] bg-gradient-to-b from-blue-500 via-violet-500 to-sky-500 transition-all duration-[1400ms] ease-out"
            style={{ height: inView ? 'calc(100% - 2.5rem)' : '0%' }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const delay = `${i * 180}ms`;

              return (
                <div
                  key={i}
                  className="relative flex lg:flex-col items-start lg:items-center gap-6 lg:gap-0 lg:text-center"
                  style={{
                    opacity: inView ? 1 : 0,
                    transform: inView ? 'translateY(0)' : 'translateY(24px)',
                    transition: `opacity 0.5s ease ${delay}, transform 0.5s ease ${delay}`,
                  }}
                >
                  {/* Dot on the line */}
                  <div className="relative z-10 flex-shrink-0 lg:mb-8">
                    {/* Outer pulse ring */}
                    <span
                      className={`absolute inset-0 rounded-full ${step.dot} opacity-20 scale-150 ${inView ? 'animate-ping' : ''}`}
                      style={{ animationDelay: delay, animationDuration: '2.5s' }}
                    />
                    <div
                      className={`relative w-11 h-11 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg ${step.glow}`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="lg:mt-0 flex-1 lg:flex-none w-full group">
                    <div className="relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      {/* Step number badge */}
                      <span className={`absolute -top-3 right-4 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br ${step.color} text-white text-xs font-bold shadow`}>
                        {i + 1}
                      </span>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
