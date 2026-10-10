import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { competitionsService } from '@/services/competitions';
import type { LeaderboardRow } from '@/types';

export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    competitionsService.getLeaderboard(id, 50).then((res) => {
      setRows(res.data);
      setError(res.error);
      setLoading(false);
    });
  }, [id]);

  return (
    <Screen scroll contentStyle={{ paddingTop: Spacing.sm }}>
      <Header title="Leaderboard" showBack />
      {loading ? (
        <LoadingState message="Loading rankings…" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : rows.length === 0 ? (
        <EmptyState icon="trophy-outline" title="No entries yet" message="Be the first to join and score." />
      ) : (
        rows.map((r, i) => {
          const name =
            String(r.full_name ?? r.name ?? r.user_id ?? `Player ${i + 1}`);
          const score = Number(r.score ?? r.total ?? 0);
          return (
            <View key={`${name}-${i}`} style={styles.row}>
              <View style={[styles.rank, i < 3 && styles.rankTop]}>
                <Text style={styles.rankText}>{i + 1}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              <Text style={styles.score}>{score}</Text>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rankTop: { backgroundColor: Colors.goldMuted },
  rankText: { fontWeight: '800', color: Colors.text },
  name: { flex: 1, color: Colors.text, fontWeight: '600' },
  score: { color: Colors.goldDark, fontWeight: '800', fontSize: Typography.size.lg },
  error: { color: Colors.error, textAlign: 'center', marginTop: Spacing.xl },
});
