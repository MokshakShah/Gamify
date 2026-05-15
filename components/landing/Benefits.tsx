'use client';

import { motion } from 'framer-motion';
import { Clock, Target, TrendingUp, BrainCog } from 'lucide-react';

const benefits = [
  {
    icon: Clock,
    title: 'Save Time',
    description: 'Cut study time in half with AI-generated materials',
  },
  {
    icon: Target,
    title: 'Better Focus',
    description: 'Eliminate distractions with structured learning paths',
  },
  {
    icon: TrendingUp,
    title: 'Improve Scores',
    description: 'Smart quizzes boost exam performance',
  },
  {
    icon: BrainCog,
    title: 'Learn Deeper',
    description: 'AI adapts to your unique learning style',
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16 sm:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
            Why Choose Gamify?
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Real benefits for real learners
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group flex gap-6 p-6 rounded-2xl border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50 transition"
              >
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-700 group-hover:text-gray-800 transition">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
