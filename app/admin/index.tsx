import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { adminService, type AdminStats } from '@/services/admin';

export default function AdminDashboard() {
  const router = useRouter();
  const [s, setS] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await adminService.getStats();
    setS(data);
    setError(err);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tiles: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; tone?: string }[] = s
    ? [
        { label: 'Players', value: String(s.users), icon: 'people' },
        { label: 'Live matches', value: String(s.matches_live), icon: 'flash' },
        { label: 'Matches played', value: String(s.matches_completed), icon: 'checkmark-done' },
        { label: 'Active questions', value: String(s.questions), icon: 'help-circle' },
        { label: 'Deposits', value: formatMoney(s.deposits_total), icon: 'arrow-down-circle', tone: Colors.success },
        { label: 'Withdrawals', value: formatMoney(s.withdrawals_total), icon: 'arrow-up-circle', tone: Colors.info },
        { label: 'Platform revenue', value: formatMoney(s.platform_revenue), icon: 'cash', tone: Colors.accent },
        { label: 'Player wallets', value: formatMoney(s.wallet_balances), icon: 'wallet' },
      ]
    : [];

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={Colors.primary} />}>
      <Header title="Admin dashboard" showBack onBack={() => router.replace('/(tabs)/profile')} />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {s && s.withdrawals_pending > 0 ? (
        <View style={styles.alert}>
          <Ionicons name="time" size={18} color={Colors.warning} />
          <Text style={styles.alertText}>{s.withdrawals_pending} withdrawal(s) pending</Text>
        </View>
      ) : null}
      <View style={styles.grid}>
        {tiles.map((t) => (
          <View key={t.label} style={styles.tile}>
            <Ionicons name={t.icon} size={20} color={t.tone ?? Colors.primary} />
            <Text style={styles.value}>{t.value}</Text>
            <Text style={styles.label}>{t.label}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  err: { color: Colors.error, marginBottom: Spacing.md },
  alert: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: Colors.warningMuted, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg },
  alertText: { color: Colors.warning, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: { width: '47.5%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  value: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800', marginTop: 10 },
  label: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2, fontWeight: '600' },
});
