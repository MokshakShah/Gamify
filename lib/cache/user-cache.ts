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
    // Promise that resolves when DB is ready — prevents race conditions
    private dbReady: Promise<void>;
    private dbReadyResolve!: () => void;

    constructor() {
        this.dbReady = new Promise((resolve) => {
            this.dbReadyResolve = resolve;
        });
        if (typeof window !== 'undefined') {
            this.initDB();
        } else {
            // SSR — resolve immediately so awaits don't hang
            this.dbReadyResolve();
        }
    }

    private async initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                this.dbReadyResolve(); // resolve anyway so the app doesn't hang
                reject(request.error);
            };
            request.onsuccess = () => {
                this.db = request.result;
                this.dbReadyResolve();
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

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

    private storeName(type: string): string {
        if (type === 'mcq_sets') return 'mcq_sets';
        if (type === 'flashcards') return 'flashcards';
        return 'flashcard_status';
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

        // 1. Try memory cache — always instant
        const memItem = this.memoryCache.get(key);
        if (memItem && !this.isExpired(memItem) && memItem.userId === userId) {
            return memItem.data;
        }

        // 2. Wait for DB to be ready before attempting IndexedDB read
        if (options.persistent) {
            await this.dbReady;
            const store = this.storeName(type);
            const dbItem = await this.getFromIndexedDB<T>(store, key);

            if (dbItem && !this.isExpired(dbItem) && dbItem.userId === userId) {
                // Warm the memory cache so subsequent reads are instant
                this.memoryCache.set(key, dbItem);
                return dbItem.data;
            }
        }

        // Clean up stale memory entry
        this.memoryCache.delete(key);
        return null;
    }

    async set<T>(
        userId: string,
        type: string,
        data: T,
        options: CacheOptions = {},
        id?: string
    ): Promise<void> {
        const key = this.generateKey(userId, type, id);
        const ttl = options.ttl || 5 * 60 * 1000;

        const item: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            userId,
            expiresAt: Date.now() + ttl,
        };

        // Always write to memory cache immediately
        this.memoryCache.set(key, item);

        // Persist to IndexedDB in background (don't await — keeps UI fast)
        if (options.persistent) {
            this.dbReady.then(() => {
                const store = this.storeName(type);
                this.setToIndexedDB(store, key, item).catch(() => {
                    // IndexedDB write failure is non-fatal
                });
            });
        }
    }

    async invalidate(userId: string, type: string, id?: string): Promise<void> {
        const key = this.generateKey(userId, type, id);

        this.memoryCache.delete(key);

        if (this.db) {
            const store = this.storeName(type);
            try {
                const transaction = this.db.transaction([store], 'readwrite');
                transaction.objectStore(store).delete(key);
            } catch {
                // Non-fatal
            }
        }
    }

    async clearUserCache(userId: string): Promise<void> {
        for (const [key, item] of this.memoryCache.entries()) {
            if (item.userId === userId) {
                this.memoryCache.delete(key);
            }
        }

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
                            if (cursor.value.userId === userId) cursor.delete();
                            cursor.continue();
                        }
                    };
                } catch {
                    // Non-fatal
                }
            }
        }
    }

    cleanup(): void {
        for (const [key, item] of this.memoryCache.entries()) {
            if (this.isExpired(item)) this.memoryCache.delete(key);
        }
    }
}

// Singleton instance
const userCache = new UserCacheManager();

if (typeof window !== 'undefined') {
    setInterval(() => userCache.cleanup(), 5 * 60 * 1000);
}

export default userCache;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const mcqCache = {
    // 30 min TTL — sets don't change often
    getMcqSet: (userId: string, setId: string) =>
        userCache.get(userId, 'mcq_sets', setId, { persistent: true, ttl: 30 * 60 * 1000 }),

    setMcqSet: (userId: string, setId: string, data: any) =>
        userCache.set(userId, 'mcq_sets', data, { persistent: true, ttl: 30 * 60 * 1000 }, setId),

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