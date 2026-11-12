/**
 * Top 10 ranking + latest winners. Refreshes itself every 30 s while open.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { leaderboardService } from '@/services/leaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { timeAgo } from '@/utils/format';
import type { LeaderboardData } from '@/types';

const MEDAL = ['#F5A623', '#9AA3B5', '#C77B43'];

export default function LeaderboardScreen() {
  const { profile } = useAuth();
  const [data, setData] = useState<LeaderboardData>({ top: [], winners: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);

  const load = useCallback(async () => {
    const res = await leaderboardService.get(10);
    setData(res.data);
    setError(res.error);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      load();
      const t = setInterval(() => focused.current && load(), 30000);
      return () => {
        focused.current = false;
        clearInterval(t);
      };
    }, [load])
  );

  useEffect(() => () => { focused.current = false; }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
      <Header title="Top 10 players" />
      <Text style={styles.hint}>Ranked by points earned. Updates automatically as matches finish.</Text>

      {loading ? (
        <LoadingState message="Loading rankings…" />
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title="Could not load rankings" message="Pull down to try again." />
      ) : data.top.length === 0 ? (
        <EmptyState icon="trophy-outline" title="No rankings yet" message="Finish a match to appear on the leaderboard." />
      ) : (
        <View style={styles.card}>
          <View style={styles.headRow}>
            <Text style={[styles.head, { width: 34 }]}>#</Text>
            <Text style={[styles.head, { flex: 1 }]}>Player</Text>
            <Text style={[styles.head, { width: 56, textAlign: 'center' }]}>Games</Text>
            <Text style={[styles.head, { width: 56, textAlign: 'right' }]}>Points</Text>
          </View>
          {data.top.map((p, i) => {
            const me = p.user_id === profile?.id;
            return (
              <View key={p.user_id} style={[styles.row, i < data.top.length - 1 && styles.divider, me && styles.rowMe]}>
                <View style={{ width: 34 }}>
                  {i < 3 ? (
                    <View style={[styles.medal, { backgroundColor: MEDAL[i] }]}>
                      <Text style={styles.medalText}>{p.rank}</Text>
                    </View>
                  ) : (
                    <Text style={styles.rankNo}>{p.rank}</Text>
                  )}
                </View>
                <View style={styles.player}>
                  <Avatar name={p.name} uri={p.avatar_url} size={34} tone={me ? 'primary' : 'neutral'} />
                  <Text style={styles.name} numberOfLines={1}>{p.name}{me ? '  (you)' : ''}</Text>
                </View>
                <Text style={styles.games}>{p.games_played}</Text>
                <Text style={styles.points}>{p.points}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.sectionRow}>
        <Ionicons name="ribbon" size={18} color={Colors.accent} />
        <Text style={styles.section}>Recent winners</Text>
      </View>
      {data.winners.length === 0 ? (
        <Text style={styles.empty}>Winners will be listed here after the first match.</Text>
      ) : (
        <View style={styles.card}>
          {data.winners.map((w, i) => (
            <View key={`${w.name}-${w.completed_at}-${i}`} style={[styles.winRow, i < data.winners.length - 1 && styles.divider]}>
              <Avatar name={w.name} uri={w.avatar_url} size={34} tone="accent" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{w.name}</Text>
                <Text style={styles.when}>{timeAgo(w.completed_at)}</Text>
              </View>
              <Text style={styles.prize}>+{formatMoney(w.prize)}</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginBottom: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  head: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  rowMe: { backgroundColor: Colors.primarySoft, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  medal: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  medalText: { color: Colors.white, fontWeight: '800', fontSize: 12 },
  rankNo: { color: Colors.textSecondary, fontWeight: '800', fontSize: Typography.size.md, textAlign: 'center', width: 26 },
  player: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  name: { color: Colors.text, fontWeight: '600', fontSize: Typography.size.md, flexShrink: 1 },
  games: { width: 56, textAlign: 'center', color: Colors.textSecondary, fontWeight: '600' },
  points: { width: 56, textAlign: 'right', color: Colors.primary, fontWeight: '800', fontSize: Typography.size.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  section: { color: Colors.text, fontSize: Typography.size.lg, fontWeight: '800' },
  empty: { color: Colors.textMuted, fontSize: Typography.size.sm, marginBottom: Spacing.xl },
  winRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  when: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 1 },
  prize: { color: Colors.success, fontWeight: '800' },
});
