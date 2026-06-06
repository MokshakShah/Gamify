'use client';

import { useState, useEffect } from 'react';
import { Database, RefreshCw, Trash2, Info } from 'lucide-react';
import { useCache } from '@/lib/cache/cache-cleanup';

type CacheStats = {
  message: string;
  features: string[];
};

export function CacheStatus({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const cache = useCache();

  useEffect(() => {
    if (isOpen) {
      setStats(cache.getCacheStats());
    }
  }, [isOpen, cache]);

  const handleClearCache = async () => {
    setLoading(true);
    try {
      await cache.clearUserCache(userId);
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    setLoading(true);
    try {
      await cache.forceRefreshUserData(userId);
      alert('Force refresh initiated! Reload the page to see fresh data.');
    } catch (error) {
      console.error('Failed to force refresh:', error);
      alert('Failed to force refresh');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition z-50"
        title="Cache Status"
      >
        <Database className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Cache Status</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        {stats && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Active</span>
              </div>
              <p className="text-xs text-green-800">{stats.message}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-900 mb-2">Features:</h4>
              <ul className="space-y-1">
                {stats.features.map((feature, index) => (
                  <li key={index} className="text-xs text-slate-600 flex items-start gap-1">
                    <span className="text-green-500 mt-0.5">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleForceRefresh}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={handleClearCache}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            </div>

            <div className="text-xs text-slate-500 text-center pt-2 border-t">
              Development Tool - Remove in production
            </div>
          </div>
        )}
      </div>
    </div>
  );
}