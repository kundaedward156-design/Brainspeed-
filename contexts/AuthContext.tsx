import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Profile } from '@/types';
import { authService } from '@/services/auth';
import { registerForPushNotifications } from '@/services/push';
import { supabase } from '@/services/supabase';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  loading: true,
  refresh: async () => {},
  setProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const pushRegistered = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const { profile: p } = await authService.getCurrentProfile();
    setProfile(p);
    if (p?.id && pushRegistered.current !== p.id) {
      pushRegistered.current = p.id;
      registerForPushNotifications(p.id).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refresh();
      if (mounted) setLoading(false);
    })();

    if (!supabase) return () => { mounted = false; };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        pushRegistered.current = null;
        if (mounted) setProfile(null);
        return;
      }
      // never await Supabase calls inside this callback (can deadlock) — defer
      setTimeout(() => { refresh(); }, 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  // Live wallet balance & stats: the server changes the profile row, we just listen.
  useEffect(() => {
    if (!supabase || !profile?.id) return;
    const channel = supabase
      .channel(`profile-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` },
        (payload) => setProfile((prev) => (prev ? { ...prev, ...(payload.new as Profile) } : prev))
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [profile?.id]);

  return (
    <AuthContext.Provider value={{ profile, loading, refresh, setProfile }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
