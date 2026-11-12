/**
 * Wallet — balance, deposit / withdraw, full history. Pending mobile-money
 * payments are re-checked with the server automatically.
 */
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { paymentsService } from '@/services/payments';
import { useAuth } from '@/contexts/AuthContext';
import { timeAgo } from '@/utils/format';
import type { WalletEntry } from '@/types';

const META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  deposit: { label: 'Deposit', icon: 'arrow-down-circle' },
  withdraw: { label: 'Withdrawal', icon: 'arrow-up-circle' },
  entry_fee: { label: 'Match entry', icon: 'flash' },
  entry_refund: { label: 'Entry refund', icon: 'refresh-circle' },
  prize: { label: 'Prize won', icon: 'trophy' },
};

export default function WalletScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [rows, setRows] = useState<WalletEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(false);

  const load = useCallback(async () => {
    // let the server reconcile anything still pending with Lipila, then read history
    const settled = await paymentsService.refreshPending().catch(() => 0);
    const res = await paymentsService.history(60);
    if (!alive.current) return;
    setRows(res.data);
    setLoading(false);
    if (settled > 0) refresh();
    return res.data;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const tick = async () => {
        const data = await load();
        if (alive.current && data?.some((r) => r.status === 'pending')) timer = setTimeout(tick, 8000);
      };
      tick();
      return () => {
        alive.current = false;
        if (timer) clearTimeout(timer);
      };
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    await refresh();
    setRefreshing(false);
  };

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
      <Header title="Wallet" />

      <LinearGradient colors={[Colors.primaryDark, Colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <Text style={styles.label}>Available balance</Text>
        <Text style={styles.value}>{formatMoney(profile?.balance_zmw)}</Text>
        <View style={styles.actions}>
          <Button title="Deposit" icon="add-circle-outline" onPress={() => router.push('/deposit')} style={styles.actionBtn} textStyle={{ color: Colors.primaryDeep }} />
          <Button title="Withdraw" icon="arrow-up-circle-outline" variant="ghost" onPress={() => router.push('/withdraw')} style={styles.actionGhost} textStyle={{ color: Colors.white }} />
        </View>
      </LinearGradient>

      <Text style={styles.section}>Transactions</Text>
      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState icon="receipt-outline" title="No transactions yet" message="Deposits, entry fees, prizes and withdrawals will show up here." />
      ) : (
        <View style={styles.list}>
          {rows.map((r, i) => {
            const m = META[r.type] ?? { label: r.type, icon: 'ellipse' as const };
            const positive = r.amount > 0;
            const pending = r.status === 'pending';
            const failed = r.status === 'failed';
            return (
              <View key={r.id} style={[styles.row, i < rows.length - 1 && styles.divider]}>
                <View style={[styles.icon, { backgroundColor: positive ? Colors.successMuted : Colors.primarySoft }]}>
                  <Ionicons name={m.icon} size={20} color={positive ? Colors.success : Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{m.label}</Text>
                  <Text style={styles.when}>
                    {timeAgo(r.created_at)}
                    {pending ? ' · Pending' : failed ? ' · Failed' : ''}
                  </Text>
                </View>
                <Text style={[styles.amount, positive && { color: Colors.success }, (pending || failed) && { color: Colors.textMuted, textDecorationLine: failed ? 'line-through' : 'none' }]}>
                  {positive ? '+' : '−'}{formatMoney(Math.abs(r.amount))}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, ...Shadows.button },
  label: { color: Colors.whiteMuted, fontSize: Typography.size.sm, fontWeight: '600' },
  value: { color: Colors.white, fontSize: 40, fontWeight: '800', marginTop: 4, marginBottom: Spacing.lg },
  actions: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flex: 1, backgroundColor: Colors.white },
  actionGhost: { flex: 1, backgroundColor: Colors.whiteFaint, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  section: { color: Colors.text, fontSize: Typography.size.lg, fontWeight: '800', marginBottom: Spacing.md },
  list: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.text, fontWeight: '700', fontSize: Typography.size.md },
  when: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  amount: { color: Colors.text, fontWeight: '800', fontSize: Typography.size.md },
});
