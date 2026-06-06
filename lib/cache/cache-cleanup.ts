// Cache cleanup utilities for maintenance and debugging
import userCache, { mcqCache, flashcardCache } from './user-cache';

export const cacheUtils = {
  // Clear all cache for a specific user (useful when user signs out)
  async clearUserCache(userId: string) {
    await userCache.clearUserCache(userId);
    console.log(`Cache cleared for user: ${userId}`);
  },

  // Invalidate all MCQ-related cache for a user
  async invalidateAllMcqCache(userId: string) {
    await mcqCache.invalidateMcqSet(userId, 'list');
    console.log(`MCQ cache invalidated for user: ${userId}`);
  },

  // Invalidate all flashcard-related cache for a user
  async invalidateAllFlashcardCache(userId: string) {
    await flashcardCache.invalidateFlashcards(userId);
    console.log(`Flashcard cache invalidated for user: ${userId}`);
  },

  // Get cache statistics (for debugging)
  getCacheStats() {
    // This is a simplified version - in a real app you might want more detailed stats
    return {
      message: 'Cache is active and managing MCQ sets, flashcards, and flashcard statuses',
      features: [
        'User-specific caching with IndexedDB persistence',
        'Automatic cache expiration (5-30 minutes depending on data type)',
        'Memory + persistent storage for optimal performance',
        'Cache invalidation on data mutations'
      ]
    };
  },

  // Force refresh all data for a user (bypasses cache)
  async forceRefreshUserData(userId: string) {
    await this.clearUserCache(userId);
    console.log(`Force refresh initiated for user: ${userId}`);
  }
};

// Hook for React components to easily manage cache
export const useCache = () => {
  return {
    clearUserCache: cacheUtils.clearUserCache,
    invalidateAllMcqCache: cacheUtils.invalidateAllMcqCache,
    invalidateAllFlashcardCache: cacheUtils.invalidateAllFlashcardCache,
    forceRefreshUserData: cacheUtils.forceRefreshUserData,
    getCacheStats: cacheUtils.getCacheStats,
  };
};