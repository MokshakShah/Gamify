import {
  FileText,
  BookOpen,
  Zap,
  MessageCircle,
  BarChart3,
  Trophy,
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Smart Summaries',
    description: 'AI-generated summaries in multiple formats for instant understanding',
  },
  {
    icon: BookOpen,
    title: 'AI Quizzes',
    description: 'Auto-generated questions with instant grading and explanations',
  },
  {
    icon: Zap,
    title: 'Flashcards',
    description: 'Spaced repetition system optimized for better retention',
  },
  {
    icon: MessageCircle,
    title: 'AI Tutor',
    description: 'Chat with AI that understands your materials perfectly',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track progress and identify areas for improvement',
  },
  {
    icon: Trophy,
    title: 'Gamification',
    description: 'Earn achievements and compete with friends',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 dark:bg-black/20 bg-white">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
            Powerful Features
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Everything you need to study smarter
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-8 rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white dark:hover:border-white/20 hover:border-blue-300 transition-all duration-200 overflow-hidden hover:shadow-lg dark:hover:shadow-blue-500/10"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/30 transition-colors">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-700 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
