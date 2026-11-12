import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { adminService, type AdminMatch } from '@/services/admin';
import { timeAgo } from '@/utils/format';

export default function AdminMatches() {
  const [rows, setRows] = useState<AdminMatch[]>([]);
  useFocusEffect(useCallback(() => { adminService.listMatches().then((r) => setRows(r.data)); }, []));
  return (
    <Screen scroll>
      <Header title="Matches" />
      {rows.length === 0 ? (
        <EmptyState icon="flash-outline" title="No matches yet" message="Matches appear here as players compete." />
      ) : (
        <View style={styles.list}>
          {rows.map((m, i) => (
            <View key={m.id} style={[styles.row, i < rows.length - 1 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.names}>{m.player1 || '—'}  vs  {m.player2 || '—'}</Text>
                <Text style={styles.sub}>
                  {m.status === 'completed'
                    ? `${m.player1_score} – ${m.player2_score} · ${m.is_draw ? 'Draw' : `Winner: ${m.winner}`}`
                    : m.status.replace('_', ' ')} · {timeAgo(m.created_at)}
                </Text>
              </View>
              {m.status === 'completed' && !m.is_draw ? <Text style={styles.prize}>{formatMoney(m.prize_zmw)}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  names: { color: Colors.text, fontWeight: '700' },
  sub: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 3, textTransform: 'capitalize' },
  prize: { color: Colors.success, fontWeight: '800' },
});
