// In-memory cache per function instance. Keeps the pending promise, so concurrent
// requests share one load, and forgets failed loads so the next request retries.

export const READ_CACHE_TTL_MS = 60_000;

interface Entry<T> {
  expiresAt: number;
  value: Promise<T>;
}

export interface Cache {
  get<T>(key: string, load: () => Promise<T>): Promise<T>;
}

export function createCache(ttlMs: number, now: () => number = () => Date.now()): Cache {
  const entries = new Map<string, Entry<unknown>>();

  return {
    get<T>(key: string, load: () => Promise<T>): Promise<T> {
      const entry = entries.get(key) as Entry<T> | undefined;
      if (entry && entry.expiresAt > now()) return entry.value;

      const value = load();
      const created: Entry<T> = { expiresAt: now() + ttlMs, value };
      entries.set(key, created);
      value.catch(() => {
        if (entries.get(key) === created) entries.delete(key);
      });
      return value;
    },
  };
}
