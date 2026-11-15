/** Tiny stale-while-revalidate cache: show the last known data instantly, refresh in the background. */
import AsyncStorage from '@react-native-async-storage/async-storage';

const mem = new Map<string, unknown>();
const PREFIX = 'qv:cache:';

export function cacheGet<T>(key: string): T | undefined {
  return mem.get(key) as T | undefined;
}

export async function cacheLoad<T>(key: string): Promise<T | undefined> {
  if (mem.has(key)) return mem.get(key) as T;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw) {
      const v = JSON.parse(raw) as T;
      mem.set(key, v);
      return v;
    }
  } catch {}
  return undefined;
}

export function cacheSet(key: string, value: unknown) {
  mem.set(key, value);
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {});
}
