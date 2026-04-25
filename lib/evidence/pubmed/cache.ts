import type { CacheEntry } from "./types";

export interface ICache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
}

class InMemoryCache implements ICache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      console.log(`[evidence:cache] miss key=${key}`);
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      console.log(`[evidence:cache] expired key=${key}`);
      return null;
    }
    console.log(`[evidence:cache] hit key=${key}`);
    return entry.data as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { data: value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

// Module-level singleton — persists across requests within a Node.js server process.
// Replace with Redis-backed implementation by swapping this export.
export const evidenceCache: ICache = new InMemoryCache();

export const TTL = {
  SEARCH: 6 * 60 * 60 * 1000,         // 6 hours
  ARTICLE: 7 * 24 * 60 * 60 * 1000,   // 7 days
  ABSTRACT: 7 * 24 * 60 * 60 * 1000,  // 7 days
} as const;

export function searchCacheKey(normalizedQuery: string): string {
  return `search:${normalizedQuery}`;
}

export function articleCacheKey(pmid: string): string {
  return `pmid:${pmid}`;
}

export function abstractCacheKey(pmid: string): string {
  return `abstract:${pmid}`;
}
