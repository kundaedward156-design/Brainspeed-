/** "Players online" on a subject page: see who is around and invite them to a duel. */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useOnlinePlayers } from '@/hooks/usePresence';
import { matchService } from '@/services/match';
import type { Subject } from '@/types';

export function OnlinePlayers({ subject }: { subject: Subject }) {
  const router = useRouter();
  const { players, loading, reload } = useOnlinePlayers(subject.id);
  const [sending, setSending] = useState<string | null>(null);

  const invite = async (userId: string) => {
    setSending(userId);
    const { data, error } = await matchService.invite(userId, subject.id);
    setSending(null);
    if (error || !data) {
      Alert.alert('Could not invite', error || 'Please try again.');
      reload();
      return;
    }
    router.push({ pathname: '/match', params: { category: subject.id } });
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.dot} />
        <Text style={styles.title}>Players online</Text>
        <Text style={styles.count}>{players.length}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
      ) : players.length === 0 ? (
        <Text style={styles.empty}>Nobody else is online right now. Tap Play to search, and you will be matched as soon as someone arrives.</Text>
      ) : (
        players.map((p) => (
          <View key={p.user_id} style={styles.row}>
            <Avatar name={p.name} uri={p.avatar_url} size={40} tone="neutral" />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {p.busy ? 'In a match' : p.here ? 'Here now' : p.plays_subject ? `Plays ${subject.name}` : 'Online'}
                {p.games_played > 0 ? ` · ${p.wins}/${p.games_played} wins` : ''}
              </Text>
            </View>
            <Button
              title={p.busy ? 'Busy' : 'Invite'}
              size="sm"
              variant={p.busy ? 'outline' : 'primary'}
              disabled={p.busy || !subject.playable || (sending !== null && sending !== p.user_id)}
              loading={sending === p.user_id}
              onPress={() => invite(p.user_id)}
            />
          </View>
        ))
      )}
      <View style={styles.foot}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.footText}>Your entry fee is held while you wait and refunded if they decline or do not answer in 60 seconds.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.success },
  title: { flex: 1, color: Colors.text, fontSize: Typography.size.lg, fontWeight: '800' },
  count: { color: Colors.textSecondary, fontSize: Typography.size.md, fontWeight: '700' },
  empty: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 19, paddingVertical: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  name: { color: Colors.text, fontSize: Typography.size.md, fontWeight: '700' },
  meta: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 2 },
  foot: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: Spacing.sm },
  footText: { flex: 1, color: Colors.textMuted, fontSize: Typography.size.xs, lineHeight: 16 },
});
