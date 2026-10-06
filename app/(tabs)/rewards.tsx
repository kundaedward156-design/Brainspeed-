import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { AppConfig } from '@/constants/config';
import { rewardsService } from '@/services/rewards';
import { authService } from '@/services/auth';
import type { Reward, RewardTransaction } from '@/types';

const { width } = Dimensions.get('window');
const CARD_W = width - Spacing.xl * 2 - 32;

export default function RewardsScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [available, setAvailable] = useState<Reward[]>([]);
  const [history, setHistory] = useState<RewardTransaction[]>([]);
  const [rewardIndex, setRewardIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const { profile } = await authService.getCurrentProfile();
    const userId = profile?.id ?? '';
    const [bal, avail, hist] = await Promise.all([
      rewardsService.getBalance(userId),
      rewardsService.listAvailable(),
      rewardsService.getHistory(userId),
    ]);
    setBalance(bal.balance_zmw);
    setAvailable(avail.data.filter((r) => r.is_active));
    setHistory(hist.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-swap reward cards when admin publishes multiple rewards
  useEffect(() => {
    if (available.length <= 1) return;
    timer.current = setInterval(() => {
      setRewardIndex((i) => (i + 1) % available.length);
    }, AppConfig.bannerRotateMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [available.length]);

  const featured = available[rewardIndex];

  return (
    <Screen scroll>
      <Header title="Rewards" />

      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>
          {AppConfig.currencySymbol} {balance.toFixed(2)}
        </Text>
        <View style={styles.balanceActions}>
          <Button
            title="Deposit"
            size="sm"
            onPress={() => router.push('/deposit')}
            style={{ flex: 1, marginRight: Spacing.sm }}
          />
          <Button title="Refresh" size="sm" variant="outline" onPress={load} style={{ flex: 1 }} />
        </View>
      </Card>

      <Text style={styles.section}>Available Rewards</Text>
      {available.length === 0 ? (
        <EmptyState
          icon="gift-outline"
          title="No rewards listed"
          message="Rewards will appear when they are published."
        />
      ) : featured ? (
        <Card style={styles.featured}>
          {featured.image_url ? (
            <Image source={{ uri: featured.image_url }} style={styles.rewardImg} resizeMode="cover" />
          ) : null}
          <Text style={styles.itemTitle}>{featured.title}</Text>
          {featured.description ? (
            <Text style={styles.itemDesc}>{featured.description}</Text>
          ) : null}
          <Text style={styles.itemAmount}>
            {AppConfig.currencySymbol} {featured.amount_zmw.toFixed(2)}
          </Text>
          {available.length > 1 ? (
            <View style={styles.dots}>
              {available.map((r, i) => (
                <View key={r.id} style={[styles.dot, i === rewardIndex && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      <Text style={styles.section}>History</Text>
      {history.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="No transactions yet"
          message="Wins, deposits, and payouts will show up here."
        />
      ) : (
        history.map((t) => (
          <Card key={t.id} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{formatType(t.type)}</Text>
              <Text style={styles.itemDesc}>{t.status}</Text>
            </View>
            <Text style={[styles.itemAmount, t.amount_zmw < 0 && { color: Colors.error }]}>
              {AppConfig.currencySymbol} {Math.abs(t.amount_zmw).toFixed(2)}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  balanceCard: { marginBottom: Spacing.xl },
  balanceLabel: { color: Colors.textSecondary, fontSize: Typography.size.sm },
  balanceValue: {
    color: Colors.text,
    fontSize: Typography.size.display,
    fontWeight: '800',
    marginVertical: Spacing.sm,
  },
  balanceActions: { flexDirection: 'row', width: '100%', marginTop: Spacing.md },
  section: {
    color: Colors.text,
    fontSize: Typography.size.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  featured: { marginBottom: Spacing.lg, overflow: 'hidden' },
  rewardImg: {
    width: '100%',
    height: 140,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
  },
  item: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: { color: Colors.text, fontWeight: '600' },
  itemDesc: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  itemAmount: { color: Colors.goldDark, fontWeight: '700', marginLeft: Spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.borderStrong },
  dotActive: { backgroundColor: Colors.gold, width: 16 },
});
