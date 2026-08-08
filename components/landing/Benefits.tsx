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
    <section id="benefits" className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white dark:bg-black/20">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
            Why Choose Gamify?
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Real benefits for real learners
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="group flex gap-6 p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-blue-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/8 transition-all duration-200"
              >
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/30 transition-colors">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{benefit.title}</h3>
                  <p className="text-gray-700 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
