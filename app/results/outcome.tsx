/**
 * Results — loads CompetitionResult from competitionsService
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { AppConfig } from '@/constants/config';
import { competitionsService } from '@/services/competitions';
import type { CompetitionResult } from '@/types';

export default function ResultsScreen() {
  const router = useRouter();
  const { competitionId } = useLocalSearchParams<{ competitionId?: string }>();
  const [result, setResult] = useState<CompetitionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitionId) {
      setLoading(false);
      return;
    }
    competitionsService.getResult(competitionId).then((res) => {
      setResult(res.data);
      setLoading(false);
    });
  }, [competitionId]);

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading results…" />
      </Screen>
    );
  }

  const isWinner = result?.is_winner ?? false;
  const myScore = result?.my_score ?? 0;
  const opponentScore = result?.opponent_score ?? 0;
  const correct = result?.correct_count ?? 0;
  const incorrect = result?.incorrect_count ?? 0;
  const avgMs = result?.avg_speed_ms ?? 0;
  const prize = result?.prize_zmw ?? 0;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.iconCircle, isWinner ? styles.win : styles.lose]}>
          <Ionicons
            name={isWinner ? 'trophy' : 'refresh'}
            size={48}
            color={isWinner ? Colors.gold : Colors.textMuted}
          />
        </View>
        <Text style={styles.title}>{isWinner ? 'Congratulations!' : 'Good effort'}</Text>
        <Text style={styles.sub}>
          {isWinner
            ? 'You won this competition.'
            : 'Stay sharp — compete again and claim the win.'}
        </Text>
      </View>

      <Card style={styles.stats}>
        <StatRow label="Your score" value={String(myScore)} />
        <StatRow label="Opponent score" value={String(opponentScore)} />
        <StatRow label="Correct answers" value={String(correct)} />
        <StatRow label="Incorrect answers" value={String(incorrect)} />
        <StatRow
          label="Avg. answer speed"
          value={avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s` : '—'}
        />
        {isWinner && prize > 0 ? (
          <StatRow
            label="Reward"
            value={`${AppConfig.currencySymbol} ${prize.toFixed(2)}`}
            highlight
          />
        ) : null}
      </Card>

      <Button
        title="Compete Again"
        onPress={() => router.replace('/(tabs)/compete')}
        size="lg"
        fullWidth
        style={{ marginTop: Spacing.xl }}
      />
      <Button
        title="Back to Home"
        onPress={() => router.replace('/(tabs)')}
        variant="ghost"
        size="md"
        fullWidth
        style={{ marginTop: Spacing.md }}
      />
    </Screen>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.highlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', paddingVertical: Spacing.xxl },
  hero: { alignItems: 'center', marginBottom: Spacing.xxl },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  win: { backgroundColor: Colors.goldMuted },
  lose: { backgroundColor: Colors.surfaceMuted },
  title: { color: Colors.text, fontSize: Typography.size.xxxl, fontWeight: '800' },
  sub: {
    color: Colors.textSecondary,
    fontSize: Typography.size.md,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  stats: { marginBottom: Spacing.md },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statLabel: { color: Colors.textSecondary, fontSize: Typography.size.md },
  statValue: { color: Colors.text, fontWeight: '700', fontSize: Typography.size.md },
  highlight: { color: Colors.gold },
});
