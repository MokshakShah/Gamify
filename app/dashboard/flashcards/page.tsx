'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Star, BookOpen, Calendar, ChevronLeft, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';
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
                <h2 className="text-xl font-semibold text-slate-900 flex-1">
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
                <div className="space-y-3">
                  {options.map((option) => (
                    <div
                      key={option.key}
                      className="p-4 rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <span className="font-medium text-slate-700">{option.key})</span> {option.text}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Options with correct answer highlighted */}
                  <div className="space-y-3">
                    {options.map((option) => {
                      const isCorrect = option.key === currentFlashcard.question.correct_answer;
                      return (
                        <div
                          key={option.key}
                          className={`p-4 rounded-lg border ${
                            isCorrect
                              ? 'bg-green-50 border-green-200 text-green-900'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="font-medium">{option.key})</span> {option.text}
                          {isCorrect && <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Explanation:</h4>
                    <p className="text-sm text-blue-800">{currentFlashcard.question.explanation}</p>
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
        {/* Stats */}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flashcards.map((flashcard) => (
            <div key={flashcard.id} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Flashcard
                  </span>
                </div>
                <button
                  onClick={() => removeFlashcard(flashcard.question.id)}
                  className="opacity-0 group-hover:opacity-100 transition p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                  title="Remove from flashcards"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 line-clamp-3 text-sm">
                  {flashcard.question.question}
                </h3>
                
                <div className="text-xs text-slate-600">
                  <p className="font-medium">{flashcard.mcq_set_title}</p>
                  <p>{flashcard.mcq_set_topic}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {formatDate(flashcard.added_at)}
                  </div>
                  
                  <div className="text-xs font-semibold text-blue-600">
                    Answer: {flashcard.question.correct_answer}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
