// Server-side API response caching utilities
// This provides server-side caching to complement client-side caching

interface CachedResponse {
  data: any;
  timestamp: number;
  expiresAt: number;
  userId: string;
}

class ApiCache {
  private cache = new Map<string, CachedResponse>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  private generateKey(userId: string, endpoint: string, params?: string): string {
    return `${userId}:${endpoint}${params ? `:${params}` : ''}`;
  }

  private isExpired(item: CachedResponse): boolean {
    return Date.now() > item.expiresAt;
  }

  get(userId: string, endpoint: string, params?: string): any | null {
    const key = this.generateKey(userId, endpoint, params);
    const item = this.cache.get(key);

    if (!item || this.isExpired(item) || item.userId !== userId) {
      // Clean up expired or invalid items
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(userId: string, endpoint: string, data: any, ttl?: number, params?: string): void {
    const key = this.generateKey(userId, endpoint, params);
    const cacheTtl = ttl || this.DEFAULT_TTL;
    
    const item: CachedResponse = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + cacheTtl,
      userId,
    };

    this.cache.set(key, item);
  }

  invalidate(userId: string, endpoint: string, params?: string): void {
    const key = this.generateKey(userId, endpoint, params);
    this.cache.delete(key);
  }

  invalidatePattern(userId: string, pattern: string): void {
    const prefix = `${userId}:${pattern}`;
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clearUser(userId: string): void {
    for (const [key, item] of this.cache) {
      if (item.userId === userId) {
        this.cache.delete(key);
      }
    }
  }

  // Clean up expired items periodically
  cleanup(): void {
    for (const [key, item] of this.cache) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    const total = this.cache.size;
    const expired = Array.from(this.cache.values()).filter(item => this.isExpired(item)).length;
    
    return {
      total,
      expired,
      active: total - expired,
    };
  }
}

// Singleton instance
const apiCache = new ApiCache();

// Clean up expired items every 10 minutes
setInterval(() => apiCache.cleanup(), 10 * 60 * 1000);

export default apiCache;

// Helper functions for common API endpoints
export const cacheHelpers = {
  // MCQ Sets caching
  getMcqSets: (userId: string) => apiCache.get(userId, 'mcq-sets'),
  setMcqSets: (userId: string, data: any) => apiCache.set(userId, 'mcq-sets', data, 10 * 60 * 1000), // 10 min
  invalidateMcqSets: (userId: string) => apiCache.invalidate(userId, 'mcq-sets'),

  // Individual MCQ Set caching
  getMcqSet: (userId: string, setId: string) => apiCache.get(userId, 'mcq-set', setId),
  setMcqSet: (userId: string, setId: string, data: any) => apiCache.set(userId, 'mcq-set', data, 15 * 60 * 1000, setId), // 15 min
  invalidateMcqSet: (userId: string, setId: string) => apiCache.invalidate(userId, 'mcq-set', setId),

  // Flashcards caching
  getFlashcards: (userId: string) => apiCache.get(userId, 'flashcards'),
  setFlashcards: (userId: string, data: any) => apiCache.set(userId, 'flashcards', data, 8 * 60 * 1000), // 8 min
  invalidateFlashcards: (userId: string) => apiCache.invalidate(userId, 'flashcards'),

  // Flashcard status caching
  getFlashcardStatus: (userId: string, questionId: string) => apiCache.get(userId, 'flashcard-status', questionId),
  setFlashcardStatus: (userId: string, questionId: string, data: any) => apiCache.set(userId, 'flashcard-status', data, 30 * 60 * 1000, questionId), // 30 min
  invalidateFlashcardStatus: (userId: string, questionId: string) => apiCache.invalidate(userId, 'flashcard-status', questionId),

  // Clear all cache for a user
  clearUserCache: (userId: string) => apiCache.clearUser(userId),

  // Get cache stats
  getStats: () => apiCache.getStats(),
};