// teeny LRU just for option-map caching
type Entry<T> = { v: T; at: number };
const CACHE = new Map<string, Entry<any>>();
const MAX = 200;          // keep it small
const TTL_MS = 1000 * 60 * 30; // 30 min

export function lruGet<T>(k: string): T | undefined {
  const e = CACHE.get(k);
  if (!e) return;
  if (Date.now() - e.at > TTL_MS) {
    CACHE.delete(k);
    return;
  }
  e.at = Date.now();
  return e.v as T;
}

export function lruSet<T>(k: string, v: T) {
  if (CACHE.size >= MAX) {
    // delete oldest
    let oldestK: string | undefined;
    let oldestAt = Infinity;
    for (const [key, e] of CACHE.entries()) {
      if (e.at < oldestAt) {
        oldestAt = e.at;
        oldestK = key;
      }
    }
    if (oldestK) CACHE.delete(oldestK);
  }
  CACHE.set(k, { v, at: Date.now() });
}
