'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Calendar, 
  FileText, 
  MoreVertical, 
  Play, 
  Trash2, 
  Video 
} from 'lucide-react';

type McqSet = {
  id: string;
  title: string;
  topic: string;
  source_type: 'topic' | 'pdf' | 'youtube';
  created_at: string;
};

type McqSetCardProps = {
  mcqSet: McqSet;
  onDelete: () => void;
};

export function McqSetCard({ mcqSet, onDelete }: McqSetCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getSourceIcon = () => {
    switch (mcqSet.source_type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'youtube':
        return <Video className="h-4 w-4 text-red-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSourceLabel = () => {
    switch (mcqSet.source_type) {
      case 'pdf':
        return 'PDF';
      case 'youtube':
        return 'Video';
      default:
        return 'Topic';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    setShowMenu(false);
    onDelete();
  };

  return (
    <>
      <div className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getSourceIcon()}
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {getSourceLabel()}
            </span>
          </div>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-8 z-10 w-32 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h3 className="font-semibold text-slate-900 line-clamp-2">
            {mcqSet.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600 line-clamp-2">
            {mcqSet.topic}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            {formatDate(mcqSet.created_at)}
          </div>
          
          <Link
            href={`/dashboard/mcq/${mcqSet.id}`}
            className="flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <Play className="h-3 w-3" />
            Start Quiz
          </Link>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-900">
              Delete MCQ Set?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove "{mcqSet.title}" and all its questions.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}