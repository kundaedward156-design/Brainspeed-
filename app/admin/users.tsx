import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { adminService } from '@/services/admin';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminService.listUsers();
    setUsers(res.data as any[]);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen
      scroll
      contentStyle={{}}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
    >
      <Header title="Users" />
      <Text style={styles.hint}>Registered players and admins.</Text>
      {loading ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState icon="people-outline" title="No users yet" message="Registered players will appear here." />
      ) : (
        users.map((u) => (
          <View key={u.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{u.full_name || 'Unnamed'}</Text>
              <Text style={styles.email}>{u.email}</Text>
            </View>
            <Text style={styles.role}>{u.role || 'player'}</Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textMuted, fontSize: Typography.size.sm, marginBottom: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  name: { color: Colors.text, fontWeight: '700' },
  email: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 2 },
  role: { color: Colors.gold, fontWeight: '700', textTransform: 'uppercase', fontSize: 11 },
});
