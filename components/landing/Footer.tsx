import { BookOpen } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative dark:bg-black/40 bg-white dark:border-white/10 border-t border-gray-200 text-gray-700 dark:text-gray-300 px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">Gamify</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Transform the way you learn with AI-powered study tools.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              {['Features', 'Pricing', 'How It Works', 'Download'].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              {['About', 'Blog', 'Careers', 'Press'].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              {['Privacy', 'Terms', 'Contact', 'Support'].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="dark:border-white/10 border-t border-gray-200 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <p>&copy; 2026 Gamify. All rights reserved.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Twitter</a>
              <a href="https://github.com/MokshakShah" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">GitHub</a>
              <a href="https://www.linkedin.com/in/mokshak-shah-3b73aa28b/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
