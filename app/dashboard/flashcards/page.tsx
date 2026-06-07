'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Star, BookOpen, ChevronLeft, ChevronRight, RotateCcw, Trash2, Calendar } from 'lucide-react';
import { PanelShell } from '@/components/dashboard/PanelShell';
import { flashcardCache } from '@/lib/cache/user-cache';

type McqQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  question_order: number;
  created_at: string;
};

type FlashcardWithQuestion = {
  id: string;
  mcq_question_id: string;
  added_at: string;
  question: McqQuestion;
  mcq_set_title: string;
  mcq_set_topic: string;
};

type FlashcardStats = {
  total: number;
  addedToday: number;
  addedThisWeek: number;
};

type FlashcardItemProps = {
  question: string;
  answer: string;
  explanation: string;
  setTitle: string;
  setTopic: string;
  onRemove: () => void;
};

function FlashcardItem({ question, answer, explanation, setTitle, setTopic, onRemove }: FlashcardItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative group rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md overflow-hidden">
      {/* Question - Always Visible */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Flashcard
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="opacity-0 group-hover:opacity-100 transition p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
            title="Remove from flashcards"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 line-clamp-4 text-sm leading-relaxed">
            {question}
          </h3>
          
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-medium">{setTitle}</p>
            <p className="text-slate-500">{setTopic}</p>
          </div>
        </div>
      </div>

      {/* Answer Section - Expandable */}
      <div 
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 space-y-4 bg-gradient-to-br from-green-50 to-emerald-50 border-t border-green-200">
          {/* Answer Revealed Header */}
          <div className="flex items-center gap-2 pt-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
              Answer 
            </span>
          </div>

          {/* Correct Answer */}
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-400 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-700 font-bold text-xs">✓</span>
              </div>
              <span className="text-sm font-semibold text-green-800">Correct Answer</span>
            </div>
            <p className="text-sm text-slate-900 font-medium leading-relaxed">{answer}</p>
          </div>

          {/* Explanation */}
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-400 shadow-sm">
            <h4 className="text-xs font-semibold text-blue-900 mb-2 uppercase tracking-wide flex items-center gap-1">
              <span>💡</span>
              <span>Explanation</span>
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">{explanation}</p>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <div className="px-6 pb-6">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="w-60 text-center py-3 rounded-lg bg-blue-50 border border-blue-300 hover:bg-blue-200 transition"
          >
            <div className="flex gap-2 text-sm text-blue-600 font-medium">
              <span>📨</span>
              <span>Click to reveal answer</span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setIsOpen(false)}
            className="w-full text-center  rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition"
          >
            <span className="text-xs text-slate-600 font-medium">Close Answer</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  const { userId, isLoaded } = useAuth();
  const [flashcards, setFlashcards] = useState<FlashcardWithQuestion[]>([]);
  const [stats, setStats] = useState<FlashcardStats>({ total: 0, addedToday: 0, addedThisWeek: 0 });
  const [loading, setLoading] = useState(true);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyMode, setStudyMode] = useState(false);

  useEffect(() => {
    if (!isLoaded || !userId) {
      if (isLoaded) setLoading(false);
      return;
    }

    fetchFlashcards();
  }, [userId, isLoaded]);

  const fetchFlashcards = async () => {
    try {
      // Try to get from cache first
      const cachedFlashcards = await flashcardCache.getFlashcards(userId!);
      
      if (cachedFlashcards) {
        console.log('Flashcards loaded from cache');
        setFlashcards(cachedFlashcards.flashcards || []);
        setStats(cachedFlashcards.stats || { total: 0, addedToday: 0, addedThisWeek: 0 });
        setLoading(false);
        return;
      }

      // If not in cache, fetch from API
      console.log('Flashcards not in cache, fetching from API');
      const res = await fetch('/api/flashcards');
      if (res.ok) {
        const data = await res.json();
        setFlashcards(data.flashcards || []);
        setStats(data.stats || { total: 0, addedToday: 0, addedThisWeek: 0 });
        
        // Cache the result for future use
        await flashcardCache.setFlashcards(userId!, data);
      }
    } catch (error) {
      console.error('Failed to fetch flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFlashcard = async (questionId: string) => {
    try {
      const res = await fetch(`/api/flashcards/${questionId}`, { method: 'DELETE' });
      if (res.ok) {
        // Update local state
        setFlashcards(prev => prev.filter(fc => fc.question.id !== questionId));
        setStats(prev => ({ ...prev, total: prev.total - 1 }));
        
        // Update cache - invalidate flashcards list and flashcard status
        await flashcardCache.invalidateFlashcards(userId!);
        await flashcardCache.invalidateFlashcardStatus(userId!, questionId);
        
        // Adjust current card if needed
        if (currentCard >= flashcards.length - 1 && currentCard > 0) {
          setCurrentCard(prev => prev - 1);
        }
        setShowAnswer(false);
      }
    } catch (error) {
      console.error('Failed to remove flashcard:', error);
    }
  };

  const nextCard = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(prev => prev + 1);
      setShowAnswer(false);
    }
  };

  const prevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(prev => prev - 1);
      setShowAnswer(false);
    }
  };

  const restartStudy = () => {
    setCurrentCard(0);
    setShowAnswer(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <PanelShell
        title="Flashcards"
        description="Review your favorite questions for quick revision."
      >
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      </PanelShell>
    );
  }

  if (!userId) {
    return (
      <PanelShell
        title="Flashcards"
        description="Review your favorite questions for quick revision."
      >
        <div className="text-center py-12">
          <p className="text-slate-600">Please sign in to access your flashcards.</p>
        </div>
      </PanelShell>
    );
  }

  if (flashcards.length === 0) {
    return (
      <PanelShell
        title="Flashcards"
        description="Review your favorite questions for quick revision."
      >
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <Star className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No flashcards yet</h3>
          <p className="mt-2 text-sm text-slate-600">
            Star questions during quizzes to add them to your flashcards for quick review.
          </p>
          <div className="mt-4 text-sm text-slate-500">
            <p>💡 <strong>Tip:</strong> Look for the star icon next to questions during MCQ quizzes</p>
            <p>⭐ Golden star = Added to flashcards</p>
            <p>☆ Empty star = Click to add</p>
          </div>
        </div>
      </PanelShell>
    );
  }

  const currentFlashcard = flashcards[currentCard];
  const options = [
    { key: 'A', text: currentFlashcard.question.option_a },
    { key: 'B', text: currentFlashcard.question.option_b },
    { key: 'C', text: currentFlashcard.question.option_c },
    { key: 'D', text: currentFlashcard.question.option_d },
  ];

  if (studyMode && flashcards.length > 0) {
    return (
      <PanelShell
        title="Study Mode"
        description={`Card ${currentCard + 1} of ${flashcards.length}`}
      >
        <div className="space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStudyMode(false)}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              ← Exit Study Mode
            </button>
            <div className="text-sm text-slate-600">
              {currentCard + 1} / {flashcards.length}
            </div>
            <button
              onClick={restartStudy}
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="h-4 w-4" />
              Restart
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentCard + 1) / flashcards.length) * 100}%` }}
            />
          </div>

          {/* Flashcard */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 min-h-[400px] flex flex-col">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900 flex-1 leading-relaxed">
                  {currentFlashcard.question.question}
                </h2>
                <button
                  onClick={() => removeFlashcard(currentFlashcard.question.id)}
                  className="flex-shrink-0 ml-4 p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                  title="Remove from flashcards"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {!showAnswer ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="inline-flex items-center gap-3 text-lg text-blue-600 font-medium bg-blue-50 px-6 py-3 rounded-full mb-4">
                      <span className="text-2xl">📨</span>
                      <span>Think about your answer...</span>
                    </div>
                    <p className="text-sm text-slate-500">Click "Show Answer" when you're ready</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Correct Answer */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-l-4 border-green-400">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-700 font-bold">✓</span>
                      </div>
                      <span className="text-lg font-semibold text-green-800">Correct Answer</span>
                    </div>
                    <p className="text-lg text-slate-900 font-medium leading-relaxed">
                      {currentFlashcard.question[`option_${currentFlashcard.question.correct_answer.toLowerCase()}` as keyof typeof currentFlashcard.question] as string}
                    </p>
                  </div>

                  {/* Explanation */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-l-4 border-blue-400">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2 text-lg">
                      <span className="text-xl">💡</span>
                      <span>Explanation</span>
                    </h4>
                    <p className="text-slate-700 leading-relaxed">{currentFlashcard.question.explanation}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Source info */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <BookOpen className="h-4 w-4" />
                <span>{currentFlashcard.mcq_set_title}</span>
                <span>•</span>
                <span>{currentFlashcard.mcq_set_topic}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center">
            <button
              onClick={prevCard}
              disabled={currentCard === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Show Answer
              </button>
            ) : (
              <button
                onClick={nextCard}
                disabled={currentCard === flashcards.length - 1}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentCard === flashcards.length - 1 ? 'Study Complete!' : 'Next Card'}
              </button>
            )}

            <button
              onClick={nextCard}
              disabled={currentCard === flashcards.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title="Flashcards"
      description="Review your favorite questions for quick revision."
    >
      <div className="space-y-6">
        Stats
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Star className="h-5 w-5 text-blue-600 fill-current" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-600">Total Flashcards</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.addedToday}</p>
                <p className="text-sm text-slate-600">Added Today</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats.addedThisWeek}</p>
                <p className="text-sm text-slate-600">This Week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Study Mode Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Your Flashcards</h2>
          {flashcards.length > 0 && (
            <button
              onClick={() => setStudyMode(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <BookOpen className="h-4 w-4" />
              Start Studying
            </button>
          )}
        </div>

        {/* Flashcards Grid */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:items-start">
          {flashcards.map((flashcard) => {
            const correctOption = flashcard.question.correct_answer;
            const correctText = flashcard.question[`option_${correctOption.toLowerCase()}` as keyof typeof flashcard.question] as string;
            
            return (
              <FlashcardItem
                key={flashcard.id}
                question={flashcard.question.question}
                answer={correctText}
                explanation={flashcard.question.explanation}
                setTitle={flashcard.mcq_set_title}
                setTopic={flashcard.mcq_set_topic}
                onRemove={() => removeFlashcard(flashcard.question.id)}
              />
            );
          })}
        </div>
      </div>
    </PanelShell>
  );
}
