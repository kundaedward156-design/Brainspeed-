/**
 * Match results — both players' scores, correct answers and total time,
 * the winner, and the prize (read from the server; nothing is computed here).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { matchService } from '@/services/match';
import { useAuth } from '@/contexts/AuthContext';
import { formatDuration } from '@/utils/format';
import type { MatchResult } from '@/types';

export default function OutcomeScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [res, setRes] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return setError('Missing match');
      const { data, error: err } = await matchService.result(String(id));
      if (err || !data) return setError(err || 'Could not load the result');
      setRes(data);
      refresh();
    })();
  }, [id, refresh]);

  if (error) {
    return (
      <Screen contentStyle={styles.center}>
        <Text style={styles.title}>{error}</Text>
        <Button title="Back to home" onPress={() => router.replace('/(tabs)')} style={{ marginTop: Spacing.lg }} />
      </Screen>
    );
  }
  if (!res) {
    return (
      <Screen contentStyle={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </Screen>
    );
  }

  const won = !res.is_draw && res.winner_id === res.me.id;
  const lost = !res.is_draw && !won;

  return (
    <Screen scroll>
      <LinearGradient
        colors={won ? [Colors.primary, Colors.primaryDeep] : lost ? ['#5E5683', '#2E2850'] : [Colors.primaryDark, Colors.primaryDeep]}
        style={styles.hero}
      >
        <Ionicons name={won ? 'trophy' : lost ? 'sad-outline' : 'git-compare-outline'} size={54} color={won ? Colors.accent : Colors.white} />
        <Text style={styles.heroTitle}>{won ? 'You won!' : lost ? 'You lost' : "It's a draw"}</Text>
        <Text style={styles.heroSub}>
          {won ? `${formatMoney(res.prize)} added to your wallet` : lost ? 'Better luck next time — jump back in.' : 'Your entry fee was refunded.'}
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <View style={styles.headRow}>
          <View style={styles.col}>
            <Avatar name={res.me.name} uri={res.me.avatar_url} size={52} />
            <Text style={styles.pName} numberOfLines={1}>You</Text>
          </View>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.col}>
            <Avatar name={res.opponent.name} uri={res.opponent.avatar_url} size={52} tone="neutral" />
            <Text style={styles.pName} numberOfLines={1}>{res.opponent.name}</Text>
          </View>
        </View>

        <Stat label="Points" a={String(res.me.score)} b={String(res.opponent.score)} strong />
        <Stat label="Correct answers" a={`${res.me.correct}/${res.total_questions}`} b={`${res.opponent.correct}/${res.total_questions}`} />
        <Stat label="Total time" a={formatDuration(res.me.time_ms)} b={formatDuration(res.opponent.time_ms)} last />
      </View>

      <Button title="Play again" icon="flash" size="lg" fullWidth onPress={() => router.replace('/match')} />
      <Button title="Back to home" variant="ghost" fullWidth onPress={() => router.replace('/(tabs)')} style={{ marginTop: Spacing.sm }} />
    </Screen>
  );
}

function Stat({ label, a, b, strong, last }: { label: string; a: string; b: string; strong?: boolean; last?: boolean }) {
  return (
    <View style={[styles.stat, !last && styles.statDivider]}>
      <Text style={[styles.statVal, strong && styles.statStrong]}>{a}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statVal, strong && styles.statStrong, { textAlign: 'right' }]}>{b}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  title: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800', textAlign: 'center' },
  hero: { alignItems: 'center', borderRadius: BorderRadius.xl, padding: Spacing.xxl, marginBottom: Spacing.lg, ...Shadows.button },
  heroTitle: { color: Colors.white, fontSize: Typography.size.display, fontWeight: '800', marginTop: Spacing.md },
  heroSub: { color: Colors.whiteMuted, fontSize: Typography.size.md, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  pName: { color: Colors.text, fontWeight: '700', maxWidth: 120 },
  vs: { color: Colors.textMuted, fontWeight: '800' },
  stat: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  statDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  statVal: { flex: 1, color: Colors.text, fontWeight: '700', fontSize: Typography.size.lg },
  statStrong: { color: Colors.primary, fontSize: Typography.size.xxl, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', flex: 1.2 },
});
