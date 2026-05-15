'use client';

import { motion } from 'framer-motion';
import { Upload, Wand2, BarChart, Lightbulb, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'Upload',
    description: 'Add lectures, PDFs, videos, or audio',
  },
  {
    icon: Wand2,
    title: 'Process',
    description: 'AI analyzes and extracts concepts',
  },
  {
    icon: BarChart,
    title: 'Generate',
    description: 'Get summaries, quizzes, flashcards',
  },
  {
    icon: Lightbulb,
    title: 'Learn',
    description: 'Study with interactive content',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gray-50">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
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
            How It Works
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Simple process, powerful results
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  {/* Step Card */}
                  <div className="relative p-8 rounded-2xl border-gray-200 bg-white hover:border-blue-300 transition hover:shadow-blue-200">
                    {/* Content */}
                    <div className="relative z-10">
                      {/* Step Number */}
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold mb-4">
                        {index + 1}
                      </div>

                      {/* Icon */}
                      <div className="mb-4">
                        <Icon className="w-8 h-8 text-blue-600" />
                      </div>

                      {/* Title and Description */}
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-gray-700">{step.description}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Arrow to Next Step */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-16 -right-14 items-center justify-center">
                    <ArrowRight className="w-6 h-6 text-blue-400/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
