import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { notificationsService } from '@/services/notifications';
import { authService } from '@/services/auth';
import type { AppNotification } from '@/types';

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    (async () => {
      const { profile } = await authService.getCurrentProfile();
      const res = await notificationsService.listForUser(profile?.id ?? '');
      setItems(res.data);
    })();
  }, []);

  return (
    <Screen scroll>
      <Header title="Notifications" showBack />
      {items.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="You're all caught up"
          message="Competition alerts, rewards, and announcements will show here."
        />
      ) : (
        items.map((n) => (
          <Card key={n.id} style={styles.item}>
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.body}>{n.body}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { marginBottom: Spacing.md },
  title: { color: Colors.text, fontWeight: '700', fontSize: Typography.size.md },
  body: { color: Colors.textSecondary, marginTop: 4, fontSize: Typography.size.sm },
});
