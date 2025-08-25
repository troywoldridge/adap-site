// super-tiny in-memory LRU for server runtime
type Key = string;
type Entry<V> = { key: Key; value: V };

export function createLRU<V>(max = 200) {
  const map = new Map<Key, Entry<V>>();
  return {
    get(key: Key): V | undefined {
      const e = map.get(key);
      if (!e) return undefined;
      map.delete(key);
      map.set(key, e);
      return e.value;
    },
    set(key: Key, value: V) {
      if (map.has(key)) map.delete(key);
      map.set(key, { key, value });
      if (map.size > max) {
        const oldest = map.keys().next().value as Key | undefined;
        if (oldest) map.delete(oldest);
      }
    },
    has(key: Key) {
      return map.has(key);
    },
    clear() {
      map.clear();
    },
  };
}
