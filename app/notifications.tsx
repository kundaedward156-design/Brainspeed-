import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { notificationsService } from '@/services/notifications';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { timeAgo } from '@/utils/format';
import type { AppNotification } from '@/types';

const ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  match_found: { name: 'people', color: Colors.primary },
  match_start: { name: 'flash', color: Colors.primary },
  match_result: { name: 'podium', color: Colors.primary },
  prize: { name: 'trophy', color: Colors.accent },
  deposit: { name: 'arrow-down-circle', color: Colors.success },
  withdrawal: { name: 'arrow-up-circle', color: Colors.info },
  system: { name: 'megaphone', color: Colors.warning },
};

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    const res = await notificationsService.listForUser(profile.id);
    setItems(res.data);
  }, [profile?.id]);

  useEffect(() => {
    load().then(() => profile?.id && notificationsService.markAllRead(profile.id));
    if (!supabase || !profile?.id) return;
    const ch = supabase
      .channel(`notif-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  }, [load, profile?.id]);

  return (
    <Screen scroll>
      <Header title="Notifications" showBack />
      {items.length === 0 ? (
        <EmptyState icon="notifications-outline" title="You're all caught up" message="Match alerts, payments and announcements will show here." />
      ) : (
        <View style={styles.list}>
          {items.map((n, i) => {
            const ic = ICONS[n.type] ?? ICONS.system;
            return (
              <View key={n.id} style={[styles.item, i < items.length - 1 && styles.divider]}>
                <View style={[styles.icon, { backgroundColor: Colors.primarySoft }]}>
                  <Ionicons name={ic.name} size={20} color={ic.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.body}>{n.body}</Text>
                  <Text style={styles.time}>{timeAgo(n.created_at)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  item: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.lg },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.text, fontWeight: '700', fontSize: Typography.size.md },
  body: { color: Colors.textSecondary, marginTop: 3, fontSize: Typography.size.sm, lineHeight: 19 },
  time: { color: Colors.textMuted, marginTop: 5, fontSize: Typography.size.xs },
});
