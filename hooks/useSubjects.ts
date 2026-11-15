import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { categoriesService } from '@/services/categories';
import { cacheGet, cacheLoad, cacheSet } from '@/utils/cache';
import type { Subject } from '@/types';

const KEY = 'subjects';

/**
 * Subjects with live numbers. Shows the last known list instantly (no blank flash),
 * then refreshes when focused and every 30s while the screen stays open.
 */
export function useSubjects(everyMs = 30000) {
  const cached = cacheGet<Subject[]>(KEY);
  const [subjects, setSubjects] = useState<Subject[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    cacheLoad<Subject[]>(KEY).then((v) => { if (v) { setSubjects((cur) => (cur.length ? cur : v)); setLoading(false); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    const { data } = await categoriesService.listWithStats(false);
    if (data.length > 0 || !cacheGet<Subject[]>(KEY)) {
      setSubjects(data);
      cacheSet(KEY, data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, everyMs);
      return () => clearInterval(t);
    }, [load, everyMs])
  );

  return { subjects, loading, reload: load };
}
