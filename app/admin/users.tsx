import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { adminService } from '@/services/admin';
import type { Profile } from '@/types';

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  useFocusEffect(useCallback(() => { adminService.listUsers().then((r) => setUsers(r.data)); }, []));
  return (
    <Screen scroll>
      <Header title="Players" />
      {users.length === 0 ? (
        <EmptyState icon="people-outline" title="No players yet" message="Players appear here after they sign up." />
      ) : (
        <View style={styles.list}>
          {users.map((u, i) => (
            <View key={u.id} style={[styles.row, i < users.length - 1 && styles.divider]}>
              <Avatar name={u.full_name} uri={u.avatar_url} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{u.full_name || 'Player'}{u.role === 'admin' ? '  · admin' : ''}</Text>
                <Text style={styles.sub}>{u.phone || u.email} · {u.wins ?? 0}W / {u.losses ?? 0}L</Text>
              </View>
              <Text style={styles.bal}>{formatMoney(u.balance_zmw)}</Text>
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
  name: { color: Colors.text, fontWeight: '700' },
  sub: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  bal: { color: Colors.primary, fontWeight: '800' },
});
