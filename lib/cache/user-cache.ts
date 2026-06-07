// User-specific cache manager for MCQs and Flashcards
// Uses IndexedDB for persistent storage with user-based namespacing

interface CacheItem<T> {
    data: T;
    timestamp: number;
    userId: string;
    expiresAt: number;
}

interface CacheOptions {
    ttl?: number; // Time to live in milliseconds (default: 5 minutes)
    persistent?: boolean; // Use IndexedDB for persistence (default: false)
}

class UserCacheManager {
    private memoryCache = new Map<string, CacheItem<any>>();
    private dbName = 'gamify_cache';
    private dbVersion = 1;
    private db: IDBDatabase | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initDB();
        }
    }

    private async initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create stores for different data types
                if (!db.objectStoreNames.contains('mcq_sets')) {
                    db.createObjectStore('mcq_sets', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('flashcards')) {
                    db.createObjectStore('flashcards', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('flashcard_status')) {
                    db.createObjectStore('flashcard_status', { keyPath: 'key' });
                }
            };
        });
    }

    private generateKey(userId: string, type: string, id?: string): string {
        return `${userId}:${type}${id ? `:${id}` : ''}`;
    }

    private isExpired(item: CacheItem<any>): boolean {
        return Date.now() > item.expiresAt;
    }

    private async getFromIndexedDB<T>(storeName: string, key: string): Promise<CacheItem<T> | null> {
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result || null);
            };
        });
    }

    private async setToIndexedDB<T>(storeName: string, key: string, item: CacheItem<T>): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({ key, ...item });

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async get<T>(
        userId: string,
        type: string,
        id?: string,
        options: CacheOptions = {}
    ): Promise<T | null> {
        const key = this.generateKey(userId, type, id);

        // Try memory cache first
        let item = this.memoryCache.get(key);

        // If not in memory and persistent option is enabled, try IndexedDB
        if (!item && options.persistent) {
            const storeName = type === 'mcq_sets' ? 'mcq_sets' :
                type === 'flashcards' ? 'flashcards' : 'flashcard_status';
            item = await this.getFromIndexedDB<T>(storeName, key);

            // If found in IndexedDB, put it in memory cache for faster access
            if (item) {
                this.memoryCache.set(key, item);
            }
        }

        if (!item || this.isExpired(item) || item.userId !== userId) {
            // Clean up expired or invalid items
            this.memoryCache.delete(key);
            return null;
        }

        return item.data;
    }

    async set<T>(
        userId: string,
        type: string,
        data: T,
        options: CacheOptions = {},
        id?: string
    ): Promise<void> {
        const key = this.generateKey(userId, type, id);
        const ttl = options.ttl || 5 * 60 * 1000; // Default 5 minutes

        const item: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            userId,
            expiresAt: Date.now() + ttl,
        };

        // Always set in memory cache
        this.memoryCache.set(key, item);

        // If persistent option is enabled, also set in IndexedDB
        if (options.persistent) {
            const storeName = type === 'mcq_sets' ? 'mcq_sets' :
                type === 'flashcards' ? 'flashcards' : 'flashcard_status';
            await this.setToIndexedDB(storeName, key, item);
        }
    }

    async invalidate(userId: string, type: string, id?: string): Promise<void> {
        const key = this.generateKey(userId, type, id);

        // Remove from memory cache
        this.memoryCache.delete(key);

        // Remove from IndexedDB if it exists
        if (this.db) {
            const storeName = type === 'mcq_sets' ? 'mcq_sets' :
                type === 'flashcards' ? 'flashcards' : 'flashcard_status';

            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                store.delete(key);
            } catch (error) {
                console.error('Failed to delete from IndexedDB:', error);
            }
        }
    }

    async clearUserCache(userId: string): Promise<void> {
        // Clear memory cache for user
        for (const [key, item] of this.memoryCache.entries()) {
            if (item.userId === userId) {
                this.memoryCache.delete(key);
            }
        }

        // Clear IndexedDB for user
        if (this.db) {
            const storeNames = ['mcq_sets', 'flashcards', 'flashcard_status'];

            for (const storeName of storeNames) {
                try {
                    const transaction = this.db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    const request = store.openCursor();

                    request.onsuccess = (event) => {
                        const cursor = (event.target as IDBRequest).result;
                        if (cursor) {
                            const item = cursor.value;
                            if (item.userId === userId) {
                                cursor.delete();
                            }
                            cursor.continue();
                        }
                    };
                } catch (error) {
                    console.error(`Failed to clear ${storeName} for user:`, error);
                }
            }
        }
    }

    // Clean up expired items periodically
    cleanup(): void {
        const now = Date.now();

        // Clean memory cache
        for (const [key, item] of this.memoryCache.entries()) {
            if (this.isExpired(item)) {
                this.memoryCache.delete(key);
            }
        }
    }
}

// Singleton instance
const userCache = new UserCacheManager();

// Clean up expired items every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(() => userCache.cleanup(), 5 * 60 * 1000);
}

export default userCache;

// Helper functions for specific data types
export const mcqCache = {
    getMcqSet: (userId: string, setId: string) =>
        userCache.get(userId, 'mcq_sets', setId, { persistent: true, ttl: 15 * 60 * 1000 }),

    setMcqSet: (userId: string, setId: string, data: any) =>
        userCache.set(userId, 'mcq_sets', data, { persistent: true, ttl: 15 * 60 * 1000 }, setId),

    invalidateMcqSet: (userId: string, setId: string) =>
        userCache.invalidate(userId, 'mcq_sets', setId),
};

export const flashcardCache = {
    getFlashcards: (userId: string) =>
        userCache.get(userId, 'flashcards', undefined, { persistent: true, ttl: 10 * 60 * 1000 }),

    setFlashcards: (userId: string, data: any) =>
        userCache.set(userId, 'flashcards', data, { persistent: true, ttl: 10 * 60 * 1000 }),

    getFlashcardStatus: (userId: string, questionId: string) =>
        userCache.get(userId, 'flashcard_status', questionId, { ttl: 30 * 60 * 1000 }),

    setFlashcardStatus: (userId: string, questionId: string, status: boolean) =>
        userCache.set(userId, 'flashcard_status', status, { ttl: 30 * 60 * 1000 }, questionId),

    invalidateFlashcards: (userId: string) =>
        userCache.invalidate(userId, 'flashcards'),

    invalidateFlashcardStatus: (userId: string, questionId: string) =>
        userCache.invalidate(userId, 'flashcard_status', questionId),
};