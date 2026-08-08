'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef, useState, Suspense } from 'react';
import { PanelShell } from '@/components/dashboard/PanelShell';
import { McqSetCard } from '@/components/dashboard/McqSetCard';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { mcqCache } from '@/lib/cache/user-cache';

type McqSet = {
  id: string;
  title: string;
  topic: string;
  source_type: 'topic' | 'pdf' | 'youtube';
  created_at: string;
};

// ─── Topic normalization ──────────────────────────────────────────────────────
// Strips suffixes, lowercases, collapses whitespace so "Java" and "java mcqs"
// both end up in the same folder key.
function normalizeTopicKey(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/\b(mcqs?|questions?|quiz|set|sets)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Display name: title-case the key
function toDisplayName(key: string): string {
  return key
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

type TopicFolder = {
  key: string;        // normalized key
  displayName: string;
  sets: McqSet[];
};

function groupByTopic(sets: McqSet[]): TopicFolder[] {
  const map = new Map<string, McqSet[]>();

  for (const set of sets) {
    const key = normalizeTopicKey(set.topic || set.title);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(set);
  }

  // Sort folders alphabetically; within each folder sort by created_at desc
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, folderSets]) => ({
      key,
      displayName: toDisplayName(key),
      sets: [...folderSets].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }));
}

// ─── Folder row ───────────────────────────────────────────────────────────────
function TopicFolderRow({
  folder,
  defaultOpen = false,
  onDelete,
  onRename,
}: {
  folder: TopicFolder;
  defaultOpen?: boolean;
  onDelete: (setId: string) => void;
  onRename: (oldKey: string, newName: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(folder.displayName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const handleRename = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === folder.displayName) {
      setNameValue(folder.displayName);
      setEditing(false);
      return;
    }
    setSaving(true);
    await onRename(folder.key, trimmed);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="group rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Folder header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => !editing && setOpen((v) => !v)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <span className="text-slate-400 shrink-0">
            {open ? (
              <FolderOpen className="h-5 w-5 text-blue-500" />
            ) : (
              <Folder className="h-5 w-5 text-slate-400" />
            )}
          </span>

          {editing ? (
            <input
              ref={inputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setNameValue(folder.displayName); setEditing(false); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 text-sm font-semibold text-slate-800 bg-transparent border-b-2 border-blue-500 outline-none py-0.5"
            />
          ) : (
            <span className="flex-1 font-semibold text-slate-800 text-sm truncate">
              {folder.displayName}
            </span>
          )}

          <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 min-w-[1.5rem] shrink-0">
            {folder.sets.length}
          </span>
        </button>

        {/* Rename / confirm buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button
                onClick={handleRename}
                disabled={saving}
                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition disabled:opacity-50"
                title="Save"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => { setNameValue(folder.displayName); setEditing(false); }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition"
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); setOpen(true); }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition opacity-0 group-hover:opacity-100"
              title="Rename folder"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={() => !editing && setOpen((v) => !v)}
            className="p-1 text-slate-400"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Sets grid — animated */}
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {folder.sets.map((set) => (
              <McqSetCard
                key={set.id}
                mcqSet={set}
                onDelete={() => onDelete(set.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MCQ list (data fetching) ─────────────────────────────────────────────────
function McqSetList({ userId }: { userId: string }) {
  const [mcqSets, setMcqSets] = useState<McqSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchMcqSets = async () => {
      try {
        // Check cache first
        const cached = await mcqCache.getMcqSet(userId, 'list');

        if (cached) {
          // Show cached data immediately — no spinner
          setMcqSets(cached as any);
          setLoading(false);

          // Revalidate in background (stale-while-revalidate)
          fetch('/api/mcq/sets')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.mcqSets) {
                setMcqSets(data.mcqSets);
                mcqCache.setMcqSet(userId, 'list', data.mcqSets);
              }
            })
            .catch(() => {}); // silent — we already have stale data showing
          return;
        }

        // No cache — fetch and show
        const res = await fetch('/api/mcq/sets');
        if (res.ok) {
          const data = await res.json();
          setMcqSets(data.mcqSets || []);
          await mcqCache.setMcqSet(userId, 'list', data.mcqSets || []);
        }
      } catch (err) {
        console.error('Failed to fetch MCQ sets:', err);
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
        setMcqSets((prev) => prev.filter((s) => s.id !== setId));
        await mcqCache.invalidateMcqSet(userId, 'list');
        await mcqCache.invalidateMcqSet(userId, setId);
      }
    } catch (err) {
      console.error('Failed to delete MCQ set:', err);
    }
  };

  // Rename all sets in a folder by updating their topic field
  const renameFolderTopic = async (oldKey: string, newDisplayName: string) => {
    // Find all sets that belong to this folder key
    const setsToRename = mcqSets.filter(
      (s) => normalizeTopicKey(s.topic || s.title) === oldKey
    );
    if (!setsToRename.length) return;

    // Optimistic update in UI
    setMcqSets((prev) =>
      prev.map((s) =>
        normalizeTopicKey(s.topic || s.title) === oldKey
          ? { ...s, topic: newDisplayName }
          : s
      )
    );

    // Patch each set's topic in parallel
    await Promise.all(
      setsToRename.map((set) =>
        fetch(`/api/mcq/sets/${set.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: newDisplayName }),
        }).then(async (res) => {
          if (res.ok) {
            // Invalidate individual set cache so quiz page gets fresh topic
            await mcqCache.invalidateMcqSet(userId, set.id);
          }
        })
      )
    );

    // Refresh list cache
    await mcqCache.invalidateMcqSet(userId, 'list');
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl border border-slate-200 bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  if (mcqSets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <Plus className="mx-auto h-10 w-10 text-slate-300" />
        <h3 className="mt-3 text-sm font-semibold text-slate-900">No MCQ sets yet</h3>
        <p className="mt-1 text-sm text-slate-500">
          Use "Generate MCQs" above, or ask the AI Chat:
        </p>
        <ul className="mt-2 space-y-0.5 text-sm text-slate-400">
          <li>"Generate 10 MCQs on Java"</li>
          <li>"Create quiz questions for this PDF"</li>
          <li>"Make MCQs about React hooks"</li>
        </ul>
      </div>
    );
  }

  // Filter across title + topic
  const filtered = search.trim()
    ? mcqSets.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.topic.toLowerCase().includes(search.toLowerCase())
      )
    : mcqSets;

  const folders = groupByTopic(filtered);
  const totalSets = filtered.length;

  return (
    <div className="space-y-4">
      {/* Search + count */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search topics…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="shrink-0 text-xs text-slate-400">
          {totalSets} set{totalSets !== 1 ? 's' : ''} · {folders.length} topic{folders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {folders.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No results for "{search}"</p>
      ) : (
        <div className="space-y-2">
          {folders.map((folder, i) => (
            <TopicFolderRow
              key={folder.key}
              folder={folder}
              defaultOpen={i === 0}
              onDelete={deleteMcqSet}
              onRename={renameFolderTopic}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
        body: JSON.stringify({ topic: topic.trim(), count, sourceType: 'topic' }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowForm(false);
        setTopic('');
        setCount(10);
        if (data.merged) {
          alert(`✅ Added ${data.questions?.length || count} questions to existing "${data.mcqSet.title.replace(/\s*\((Video|PDF)\)$/, '')}" set.`);
        } else {
          alert(`🎉 New MCQ set created! ${data.questions?.length || count} questions for "${topic.trim()}".`);
        }
        await mcqCache.invalidateMcqSet(userId!, 'list');
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to generate MCQs');
      }
    } catch {
      alert('Failed to generate MCQs');
    } finally {
      setGenerating(false);
    }
  };

  if (!isLoaded) {
    return (
      <PanelShell title="MCQ" description="Practice quizzes organised by topic.">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </PanelShell>
    );
  }

  if (!userId) {
    return (
      <PanelShell title="MCQ" description="Practice quizzes organised by topic.">
        <div className="py-12 text-center text-sm text-slate-600">Please sign in to access MCQs.</div>
      </PanelShell>
    );
  }

  return (
    <PanelShell title="MCQ" description="Practice quizzes organised by topic.">
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your MCQ Sets</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Generate MCQs
          </button>
        </div>

        {/* Generate form */}
        {showForm && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Generate New MCQ Set</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="mb-1.5 block text-xs font-medium text-slate-600">
                  Topic
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateMcqs()}
                  placeholder="e.g. Java, React Hooks, Data Structures"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="count" className="mb-1.5 block text-xs font-medium text-slate-600">
                  Number of Questions (max 15)
                </label>
                <input
                  id="count"
                  type="number"
                  min="1"
                  max="15"
                  value={count}
                  onChange={(e) =>
                    setCount(Math.min(15, Math.max(1, parseInt(e.target.value) || 10)))
                  }
                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate
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

        {/* Folders list */}
        <Suspense
          fallback={
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl border border-slate-200 bg-white animate-pulse" />
              ))}
            </div>
          }
        >
          <McqSetList userId={userId} />
        </Suspense>
      </div>
    </PanelShell>
  );
}
