import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { adminService } from '@/services/admin';

export default function AdminUsers() {
  const [users, setUsers] = useState<unknown[]>([]);

  useEffect(() => {
    adminService.listUsers().then((res) => setUsers(res.data));
  }, []);

  return (
    <Screen scroll contentStyle={{  }}>
      <Header title="Users" />
      <Text style={styles.hint}>Status, competition stats, and account management.</Text>
      {users.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No users yet"
          message="Registered players will appear in this list."
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.whiteDim, fontSize: Typography.size.sm, marginBottom: Spacing.lg },
});
