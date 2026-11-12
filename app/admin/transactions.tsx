import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { adminService, type AdminTx } from '@/services/admin';
import { timeAgo } from '@/utils/format';

type Filter = 'all' | 'deposit' | 'withdraw';

export default function AdminTransactions() {
  const [filter, setFilter] = useState<Filter>('all');
  const [rows, setRows] = useState<AdminTx[]>([]);
  const load = useCallback(async (f: Filter) => {
    const r = await adminService.listTransactions(f === 'all' ? undefined : f);
    setRows(r.data);
  }, []);
  useFocusEffect(useCallback(() => { load(filter); }, [load, filter]));

  const tone = (s: string) => (s === 'completed' ? Colors.success : s === 'failed' ? Colors.error : Colors.warning);

  return (
    <Screen scroll>
      <Header title="Deposits & withdrawals" showBack />
      <View style={styles.tabs}>
        {(['all', 'deposit', 'withdraw'] as Filter[]).map((f) => (
          <TouchableOpacity key={f} style={[styles.tab, filter === f && styles.tabOn]} onPress={() => setFilter(f)}>
            <Text style={[styles.tabText, filter === f && styles.tabTextOn]}>{f === 'all' ? 'All' : f === 'deposit' ? 'Deposits' : 'Withdrawals'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {rows.length === 0 ? (
        <EmptyState icon="swap-vertical-outline" title="Nothing here yet" message="Mobile-money activity will be listed here." />
      ) : (
        <View style={styles.list}>
          {rows.map((t, i) => (
            <View key={t.id} style={[styles.row, i < rows.length - 1 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{t.full_name || 'Player'} · {t.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</Text>
                <Text style={styles.sub}>{t.phone} · {timeAgo(t.created_at)}</Text>
                {t.failure_reason ? <Text style={[styles.sub, { color: Colors.error }]}>{t.failure_reason}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amount}>{formatMoney(t.amount_zmw)}</Text>
                <Text style={[styles.status, { color: tone(t.status) }]}>{t.status}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: Colors.surfaceMuted, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.lg },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabOn: { backgroundColor: Colors.surface },
  tabText: { color: Colors.textSecondary, fontWeight: '600', fontSize: Typography.size.sm },
  tabTextOn: { color: Colors.primary, fontWeight: '800' },
  list: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  name: { color: Colors.text, fontWeight: '700' },
  sub: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  amount: { color: Colors.text, fontWeight: '800' },
  status: { fontSize: Typography.size.xs, fontWeight: '700', textTransform: 'capitalize', marginTop: 2 },
});
