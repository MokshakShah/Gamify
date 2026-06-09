'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState, Suspense } from 'react';
import { PanelShell } from '@/components/dashboard/PanelShell';
import { McqSetCard } from '@/components/dashboard/McqSetCard';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { mcqCache } from '@/lib/cache/user-cache';

type McqSet = {
  id: string;
  title: string;
  topic: string;
  source_type: 'topic' | 'pdf' | 'youtube';
  created_at: string;
};

function McqSetList({ userId }: { userId: string }) {
  const [mcqSets, setMcqSets] = useState<McqSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMcqSets = async () => {
      try {
        // Try to get from cache first
        const cachedMcqSets = await mcqCache.getMcqSet(userId, 'list');
        
        if (cachedMcqSets) {
          console.log('MCQ sets loaded from cache');
          setMcqSets(cachedMcqSets as any);
          setLoading(false);
          return;
        }

        // If not in cache, fetch from API
        console.log('MCQ sets not in cache, fetching from API');
        const res = await fetch('/api/mcq/sets');
        if (res.ok) {
          const data = await res.json();
          setMcqSets(data.mcqSets || []);
          
          // Cache the result for future use (5 minutes TTL)
          await mcqCache.setMcqSet(userId, 'list', data.mcqSets || []);
        }
      } catch (error) {
        console.error('Failed to fetch MCQ sets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMcqSets();
  }, [userId]);

  const deleteMcqSet = async (setId: string) => {
    try {
      const res = await fetch(`/api/mcq/sets/${setId}`, { method: 'DELETE' });
      if (res.ok) {
        // Update local state
        setMcqSets(prev => prev.filter(set => set.id !== setId));
        
        // Invalidate cache for both the list and the specific MCQ set
        await mcqCache.invalidateMcqSet(userId, 'list');
        await mcqCache.invalidateMcqSet(userId, setId);
      }
    } catch (error) {
      console.error('Failed to delete MCQ set:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
            <div className="h-20 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (mcqSets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <Plus className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-sm font-semibold text-slate-900">No MCQ sets yet</h3>
        <p className="mt-2 text-sm text-slate-600">
          Generate your first MCQ set using the button above, or ask the AI chatbot with phrases like:
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-500">
          <li>"Generate 5 MCQs on machine learning"</li>
          <li>"Create quiz questions for this PDF"</li>
          <li>"Make MCQs about React hooks"</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {mcqSets.map((set) => (
        <McqSetCard
          key={set.id}
          mcqSet={set}
          onDelete={() => deleteMcqSet(set.id)}
        />
      ))}
    </div>
  );
}

export default function McqPage() {
  const { userId, isLoaded } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);

  const handleGenerateMcqs = async () => {
    if (!topic.trim() || generating) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/mcq/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          count,
          sourceType: 'topic',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowForm(false);
        setTopic('');
        setCount(10);
        
        // Show appropriate success message
        if (data.merged) {
          alert(`✅ Success! Added ${data.questions?.length || count} questions to existing "${data.mcqSet.title.replace(/\s*\((Video|PDF)\)$/, '')}" set.`);
        } else {
          alert(`🎉 New MCQ set created! Generated ${data.questions?.length || count} questions for "${topic.trim()}".`);
        }
        
        // Invalidate MCQ sets list cache and reload
        await mcqCache.invalidateMcqSet(userId!, 'list');
        window.location.reload();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to generate MCQs');
      }
    } catch (error) {
      console.error('Failed to generate MCQs:', error);
      alert('Failed to generate MCQs');
    } finally {
      setGenerating(false);
    }
  };

  if (!isLoaded) {
    return (
      <PanelShell
        title="MCQ"
        description="Practice quizzes with timed sessions and scoring."
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </PanelShell>
    );
  }

  if (!userId) {
    return (
      <PanelShell
        title="MCQ"
        description="Practice quizzes with timed sessions and scoring."
      >
        <div className="text-center py-12">
          <p className="text-slate-600">Please sign in to access MCQs.</p>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title="MCQ"
      description="Practice quizzes with timed sessions and scoring."
    >
      <div className="space-y-6">
        {/* Generate MCQ Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Your MCQ Sets</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Generate MCQs
          </button>
        </div>

        {/* MCQ Generation Form */}
        {showForm && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Generate New MCQ Set</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-2">
                  Topic
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Machine Learning, React Hooks, Data Structures"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="count" className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Questions (Max 15)
                </label>
                <input
                  id="count"
                  type="number"
                  min="1"
                  max="15"
                  value={count}
                  onChange={(e) => setCount(Math.min(15, Math.max(1, parseInt(e.target.value) || 10)))}
                  className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGenerateMcqs}
                  disabled={!topic.trim() || generating}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate MCQs
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MCQ Sets Grid with Suspense */}
        <Suspense fallback={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
                <div className="h-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        }>
          <McqSetList userId={userId} />
        </Suspense>
      </div>
    </PanelShell>
  );
}
