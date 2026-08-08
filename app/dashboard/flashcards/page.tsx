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
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Lock body scroll when any overlay is open
  useEffect(() => {
    if (modalOpen || confirmDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen, confirmDelete]);

  return (
    <>
      {/* ── Card (never changes size) ── */}
      <div className="relative group flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md overflow-hidden">
        <div className="flex flex-col flex-1 p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flashcard</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="opacity-0 group-hover:opacity-100 transition p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
              title="Remove"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {/* Question — fixed height so grid rows align */}
          <p className="flex-1 text-sm font-semibold text-slate-800 leading-relaxed min-h-[4.5rem]">
            {question}
          </p>

          {/* Source */}
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-0.5">
            <p className="font-medium text-slate-600 truncate">{setTitle.replace(/\s*\((Video|PDF)\)$/, '')}</p>
            <p className="truncate">{setTopic}</p>
          </div>
        </div>

        {/* Reveal button — always at bottom */}
        <div className="px-5 pb-5">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full py-2.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 active:scale-95 transition-all text-sm font-medium text-blue-600 flex items-center justify-center gap-2"
          >
            <span>💡</span> Reveal Answer
          </button>
        </div>
      </div>

      {/* ── Modal overlay ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flashcard</span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Question */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Question</p>
                <p className="text-base font-semibold text-slate-900 leading-relaxed">{question}</p>
              </div>

              {/* Correct Answer */}
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold">✓</span>
                  <span className="text-sm font-semibold text-green-800">Correct Answer</span>
                </div>
                <p className="text-sm text-slate-900 font-medium leading-relaxed">{answer}</p>
              </div>

              {/* Explanation */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">💡</span>
                  <span className="text-sm font-semibold text-blue-800">Explanation</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>
              </div>

              {/* Source */}
              <p className="text-xs text-slate-400">
                {setTitle.replace(/\s*\((Video|PDF)\)$/, '')} · {setTopic}
              </p>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setModalOpen(false)}
                className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 active:scale-95 transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation dialog ── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-100">
                <Trash2 className="h-4 w-4 text-red-600" />
              </span>
              <h3 className="text-sm font-semibold text-slate-900">Remove flashcard?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5 pl-12">
              This will remove the card from your flashcard collection. You can always re-add it from the MCQ section.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirmDelete(false); onRemove(); }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
        setFlashcards((cachedFlashcards as any).flashcards || []);
        setStats((cachedFlashcards as any).stats || { total: 0, addedToday: 0, addedThisWeek: 0 });
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
                <span>{currentFlashcard.mcq_set_title.replace(/\s*\((Video|PDF)\)$/, '')}</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-stretch">
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
