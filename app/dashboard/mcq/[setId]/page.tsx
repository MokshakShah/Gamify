'use client';

import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Star, StarOff } from 'lucide-react';
import { PanelShell } from '@/components/dashboard/PanelShell';
import { mcqCache, flashcardCache } from '@/lib/cache/user-cache';

type McqQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string; // Now required
  question_order: number;
};

type McqSet = {
  id: string;
  title: string;
  topic: string;
  source_type: string;
  created_at: string;
  questions: McqQuestion[];
};

type Answer = {
  questionId: string;
  selectedAnswer: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
};

export default function McqSetPage() {
  const { userId, isLoaded } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setId = params.setId as string;

  // URL state management
  const isResultsMode = searchParams.get('results') === 'true';
  const urlScore = searchParams.get('score');
  const urlAnswers = searchParams.get('answers');

  const [mcqSet, setMcqSet] = useState<McqSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResults, setShowResults] = useState(isResultsMode);
  const [quizCompleted, setQuizCompleted] = useState(isResultsMode);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentQuestionAnswered, setCurrentQuestionAnswered] = useState(false);
  const [flashcardStatuses, setFlashcardStatuses] = useState<Record<string, boolean>>({});
  const [loadingFlashcard, setLoadingFlashcard] = useState<string | null>(null);

  // Restore answers from URL if available
  useEffect(() => {
    if (isResultsMode && urlAnswers && urlScore && mcqSet) {
      try {
        const decodedAnswers = JSON.parse(decodeURIComponent(urlAnswers));
        setAnswers(decodedAnswers);
        setCurrentQuestion(mcqSet.questions.length - 1);
      } catch (error) {
        console.error('Failed to parse URL answers:', error);
        // If URL is corrupted, redirect to start
        router.replace(`/dashboard/mcq/${setId}`);
      }
    }
  }, [isResultsMode, urlAnswers, urlScore, mcqSet, setId, router]);

  useEffect(() => {
    if (!isLoaded || !userId || !setId) {
      if (isLoaded) setLoading(false);
      return;
    }

    const fetchMcqSet = async () => {
      try {
        // Try to get from cache first
        const cachedMcqSet = await mcqCache.getMcqSet(userId, setId);
        
        if (cachedMcqSet) {
          console.log('MCQ set loaded from cache');
          setMcqSet(cachedMcqSet as any);
          
          // Load flashcard statuses from cache
          if ((cachedMcqSet as any).questions) {
            const statuses: Record<string, boolean> = {};
            
            // Try to get flashcard statuses from cache first
            const cachePromises = (cachedMcqSet as any).questions.map(async (question: McqQuestion) => {
              const cachedStatus = await flashcardCache.getFlashcardStatus(userId, question.id);
              if (cachedStatus !== null) {
                statuses[question.id] = Boolean(cachedStatus);
                return true; // Found in cache
              }
              return false; // Not in cache
            });
            
            const cacheResults = await Promise.all(cachePromises);
            
            // For questions not in cache, fetch from API
            const uncachedQuestions = (cachedMcqSet as any).questions.filter((_: any, index: number) => !cacheResults[index]);
            
            if (uncachedQuestions.length > 0) {
              await Promise.all(
                uncachedQuestions.map(async (question: McqQuestion) => {
                  try {
                    const flashcardRes = await fetch(`/api/flashcards/${question.id}`);
                    if (flashcardRes.ok) {
                      const flashcardData = await flashcardRes.json();
                      statuses[question.id] = flashcardData.isInFlashcards;
                      // Cache the result
                      await flashcardCache.setFlashcardStatus(userId, question.id, flashcardData.isInFlashcards);
                    } else {
                      statuses[question.id] = false;
                      await flashcardCache.setFlashcardStatus(userId, question.id, false);
                    }
                  } catch (error) {
                    console.error('Failed to fetch flashcard status:', error);
                    statuses[question.id] = false;
                    await flashcardCache.setFlashcardStatus(userId, question.id, false);
                  }
                })
              );
            }
            
            setFlashcardStatuses(statuses);
          }
          setLoading(false);
          return;
        }

        // If not in cache, fetch from API
        console.log('MCQ set not in cache, fetching from API');
        const res = await fetch(`/api/mcq/sets/${setId}`);
        if (res.ok) {
          const data = await res.json();
          setMcqSet(data.mcqSet);
          
          // Cache the MCQ set for future use
          await mcqCache.setMcqSet(userId, setId, data.mcqSet);
          
          // Fetch and cache flashcard statuses for all questions
          if (data.mcqSet.questions) {
            const statuses: Record<string, boolean> = {};
            await Promise.all(
              data.mcqSet.questions.map(async (question: McqQuestion) => {
                try {
                  const flashcardRes = await fetch(`/api/flashcards/${question.id}`);
                  if (flashcardRes.ok) {
                    const flashcardData = await flashcardRes.json();
                    statuses[question.id] = flashcardData.isInFlashcards;
                    // Cache the result
                    await flashcardCache.setFlashcardStatus(userId, question.id, flashcardData.isInFlashcards);
                  } else {
                    statuses[question.id] = false;
                    await flashcardCache.setFlashcardStatus(userId, question.id, false);
                  }
                } catch (error) {
                  console.error('Failed to fetch flashcard status:', error);
                  statuses[question.id] = false;
                  await flashcardCache.setFlashcardStatus(userId, question.id, false);
                }
              })
            );
            setFlashcardStatuses(statuses);
          }
        }
      } catch (error) {
        console.error('Failed to fetch MCQ set:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMcqSet();
  }, [userId, isLoaded, setId]);

  if (loading) {
    return (
      <PanelShell title="Loading..." description="">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      </PanelShell>
    );
  }

  if (!mcqSet) {
    return (
      <PanelShell title="MCQ Not Found" description="">
        <div className="text-center py-12">
          <p className="text-slate-600">The requested MCQ set could not be found.</p>
          <Link
            href="/dashboard/mcq"
            className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to MCQs
          </Link>
        </div>
      </PanelShell>
    );
  }

  const currentQ = mcqSet.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / mcqSet.questions.length) * 100;
  const score = answers.filter(a => a.isCorrect).length;
  const percentage = Math.round((score / mcqSet.questions.length) * 100);

  const handleAnswerSelect = (answer: 'A' | 'B' | 'C' | 'D') => {
    setSelectedAnswer(answer);
    setCurrentQuestionAnswered(false);
    setShowExplanation(false);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;
    
    const isCorrect = selectedAnswer === currentQ.correct_answer;
    setCurrentQuestionAnswered(true);
    
    // Only show explanation immediately if answer is wrong
    if (!isCorrect) {
      setShowExplanation(true);
    }
  };

  const handleNext = () => {
    if (selectedAnswer && currentQuestionAnswered) {
      const isCorrect = selectedAnswer === currentQ.correct_answer;
      const newAnswer: Answer = {
        questionId: currentQ.id,
        selectedAnswer: selectedAnswer as 'A' | 'B' | 'C' | 'D',
        isCorrect,
      };

      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);
      setSelectedAnswer('');
      setCurrentQuestionAnswered(false);
      setShowExplanation(false);

      if (currentQuestion + 1 < mcqSet.questions.length) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        // Quiz completed - update URL with results
        const finalScore = updatedAnswers.filter(a => a.isCorrect).length;
        const encodedAnswers = encodeURIComponent(JSON.stringify(updatedAnswers));
        
        // Update URL to include results state
        const resultsUrl = `/dashboard/mcq/${setId}?results=true&score=${finalScore}&answers=${encodedAnswers}`;
        router.replace(resultsUrl);
        
        setQuizCompleted(true);
        setShowResults(true);
      }
    }
  };

  const handleShowExplanation = () => {
    setShowExplanation(true);
  };

  const toggleFlashcard = async (questionId: string) => {
    if (loadingFlashcard === questionId) return;
    
    setLoadingFlashcard(questionId);
    const isCurrentlyInFlashcards = flashcardStatuses[questionId] || false;
    
    try {
      const method = isCurrentlyInFlashcards ? 'DELETE' : 'POST';
      const res = await fetch(`/api/flashcards/${questionId}`, { method });
      
      if (res.ok) {
        const newStatus = !isCurrentlyInFlashcards;
        
        // Update local state
        setFlashcardStatuses(prev => ({
          ...prev,
          [questionId]: newStatus
        }));
        
        // Update cache
        await flashcardCache.setFlashcardStatus(userId!, questionId, newStatus);
        
        // Invalidate flashcards list cache to refresh counts/lists
        await flashcardCache.invalidateFlashcards(userId!);
      } else {
        console.error('Failed to toggle flashcard');
      }
    } catch (error) {
      console.error('Failed to toggle flashcard:', error);
    } finally {
      setLoadingFlashcard(null);
    }
  };

  const restartQuiz = () => {
    // Clear URL parameters and reset state
    router.replace(`/dashboard/mcq/${setId}`);
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer('');
    setShowResults(false);
    setQuizCompleted(false);
    setShowExplanation(false);
    setCurrentQuestionAnswered(false);
  };

  if (showResults) {
    return (
      <PanelShell
        title="Quiz Results"
        description={`${score}/${mcqSet.questions.length} correct (${percentage}%)`}
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                percentage >= 70 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {percentage >= 70 ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                {percentage >= 70 ? 'Great Job!' : 'Keep Practicing!'}
              </h2>
              <p className="mt-2 text-slate-600">
                You scored {score} out of {mcqSet.questions.length} questions correctly
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Review Answers:</h3>
            {mcqSet.questions.map((question, index) => {
              const answer = answers[index];
              const options = [
                { key: 'A', text: question.option_a },
                { key: 'B', text: question.option_b },
                { key: 'C', text: question.option_c },
                { key: 'D', text: question.option_d },
              ];

              return (
                <div key={question.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      answer.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <p className="font-medium text-slate-900 flex-1">{question.question}</p>
                        <button
                          onClick={() => toggleFlashcard(question.id)}
                          disabled={loadingFlashcard === question.id}
                          className={`flex-shrink-0 ml-4 p-1.5 rounded-lg transition ${
                            flashcardStatuses[question.id]
                              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                          } ${loadingFlashcard === question.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={flashcardStatuses[question.id] ? 'Remove from flashcards' : 'Add to flashcards'}
                        >
                          {flashcardStatuses[question.id] ? (
                            <Star className="h-4 w-4 fill-current" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {options.map((option) => {
                          const isCorrect = option.key === question.correct_answer;
                          const wasSelected = option.key === answer.selectedAnswer;
                          
                          return (
                            <div
                              key={option.key}
                              className={`p-2 rounded-lg border text-sm ${
                                isCorrect
                                  ? 'bg-green-50 border-green-200 text-green-900'
                                  : wasSelected && !isCorrect
                                  ? 'bg-red-50 border-red-200 text-red-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="font-medium">{option.key})</span> {option.text}
                              {isCorrect && <span className="ml-2 text-green-600">✓ Correct</span>}
                              {wasSelected && !isCorrect && <span className="ml-2 text-red-600">✗ Your answer</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={restartQuiz}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Retake Quiz
            </button>
            <Link
              href="/dashboard/mcq"
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to MCQs
            </Link>
          </div>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title={mcqSet.title}
      description={`Question ${currentQuestion + 1} of ${mcqSet.questions.length}`}
    >
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex-1">
              {currentQ.question}
            </h2>
            <button
              onClick={() => toggleFlashcard(currentQ.id)}
              disabled={loadingFlashcard === currentQ.id}
              className={`flex-shrink-0 ml-4 p-2 rounded-lg transition ${
                flashcardStatuses[currentQ.id]
                  ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
              } ${loadingFlashcard === currentQ.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={flashcardStatuses[currentQ.id] ? 'Remove from flashcards' : 'Add to flashcards'}
            >
              {flashcardStatuses[currentQ.id] ? (
                <Star className="h-5 w-5 fill-current" />
              ) : (
                <StarOff className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="space-y-3">
            {[
              { key: 'A', text: currentQ.option_a },
              { key: 'B', text: currentQ.option_b },
              { key: 'C', text: currentQ.option_c },
              { key: 'D', text: currentQ.option_d },
            ].map((option) => (
              <label
                key={option.key}
                className={`block cursor-pointer rounded-lg border-2 p-4 transition ${
                  selectedAnswer === option.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option.key}
                  checked={selectedAnswer === option.key}
                  onChange={(e) => handleAnswerSelect(e.target.value as 'A' | 'B' | 'C' | 'D')}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${
                    selectedAnswer === option.key
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-300 text-slate-600'
                  }`}>
                    {option.key}
                  </div>
                  <span className="text-slate-900">{option.text}</span>
                </div>
              </label>
            ))}
          </div>
          {/* Show feedback after answering */}
          {currentQuestionAnswered && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              {selectedAnswer === currentQ.correct_answer ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Correct!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Incorrect. The correct answer is {currentQ.correct_answer}.</span>
                </div>
              )}
              
              {/* Show explanation if wrong or if user clicks show */}
              {showExplanation && (
                <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Explanation:</strong> {currentQ.explanation}
                  </p>
                </div>
              )}
              
              {/* Show explanation button if correct and not shown yet */}
              {selectedAnswer === currentQ.correct_answer && !showExplanation && (
                <button
                  onClick={handleShowExplanation}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Show explanation
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Link
            href="/dashboard/mcq"
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to MCQs
          </Link>
          
          <div className="flex gap-3">
            {!currentQuestionAnswered ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
              >
                {currentQuestion + 1 === mcqSet.questions.length ? 'Finish Quiz' : 'Next Question'}
              </button>
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}