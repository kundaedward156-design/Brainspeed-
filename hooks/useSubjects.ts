import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { categoriesService } from '@/services/categories';
import type { Subject } from '@/types';

/** Subjects with live numbers. Reloads when the screen is focused and every 30s while it stays open. */
export function useSubjects(everyMs = 30000) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await categoriesService.listWithStats(false);
    setSubjects(data);
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
