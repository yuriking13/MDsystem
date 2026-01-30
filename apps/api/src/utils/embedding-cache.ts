/**
 * Simple in-memory LRU cache for query embeddings
 *
 * Кэширует embeddings для частых запросов чтобы избежать повторных API вызовов.
 * Использует LRU (Least Recently Used) стратегию вытеснения.
 *
 * TTL: 1 час (embeddings не меняются для одного и того же текста)
 * Max entries: 1000 (примерно 6MB памяти для 1536-dim vectors)
 */

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

class EmbeddingCache {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 1000, ttlMs = 60 * 60 * 1000) {
    // 1 hour TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Создаёт ключ кэша из текста запроса
   */
  private createKey(text: string): string {
    // Простой hash для текста (не криптографический, но быстрый)
    let hash = 0;
    const normalized = text.trim().toLowerCase().slice(0, 8000);
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `emb:${hash}:${normalized.length}`;
  }

  /**
   * Получает embedding из кэша
   */
  get(text: string): number[] | null {
    const key = this.createKey(text);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Проверяем TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // LRU: перемещаем в конец (самый свежий)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.embedding;
  }

  /**
   * Сохраняет embedding в кэш
   */
  set(text: string, embedding: number[]): void {
    const key = this.createKey(text);

    // Если кэш переполнен, удаляем самый старый элемент (первый в Map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
    });
  }

  /**
   * Очищает устаревшие записи
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Статистика кэша
   */
  stats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Полная очистка кэша
   */
  clear(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const queryEmbeddingCache = new EmbeddingCache(1000, 60 * 60 * 1000);

// Периодическая очистка устаревших записей (каждые 10 минут)
setInterval(
  () => {
    const removed = queryEmbeddingCache.cleanup();
    if (removed > 0) {
      console.log(`[embedding-cache] Cleaned up ${removed} expired entries`);
    }
  },
  10 * 60 * 1000,
);
