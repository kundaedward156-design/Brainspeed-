import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { presenceService } from '@/services/presence';
import type { OnlinePlayer } from '@/types';

// One app-wide heartbeat. A subject page sets the current subject so others see "Here now".
let currentCategory: string | null = null;

/** Mount once (inside the signed-in app). Pings every 20s while the app is in the foreground. */
export function useHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const ping = () => { if (AppState.currentState === 'active') presenceService.ping(currentCategory).catch(() => {}); };
    ping();
    const t = setInterval(ping, 20000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') ping(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [enabled]);
}

/** On a subject page: report this subject and keep the online list fresh. */
export function useOnlinePlayers(categoryId: string | undefined) {
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!categoryId) return;
    const list = await presenceService.online(categoryId);
    if (alive.current) { setPlayers(list); setLoading(false); }
  }, [categoryId]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      currentCategory = categoryId ?? null;
      presenceService.ping(currentCategory).catch(() => {}).finally(load);
      const t = setInterval(load, 8000);
      return () => { alive.current = false; clearInterval(t); if (currentCategory === categoryId) currentCategory = null; };
    }, [categoryId, load])
  );
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  return { players, loading, reload: load };
}
