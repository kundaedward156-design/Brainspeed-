/** Home: everyone who is online right now. Tap Invite, pick a subject, and the invitation is sent. */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { presenceService } from '@/services/presence';
import { matchService } from '@/services/match';
import type { OnlinePlayer, Subject } from '@/types';

export function OnlineNow({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [target, setTarget] = useState<OnlinePlayer | null>(null);
  const [sending, setSending] = useState(false);
  const playable = subjects.filter((s) => s.playable);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const load = async () => { const l = await presenceService.online(null); if (alive) setPlayers(l); };
      load();
      const t = setInterval(load, 10000);
      return () => { alive = false; clearInterval(t); };
    }, [])
  );

  const send = async (s: Subject) => {
    if (!target) return;
    setSending(true);
    const { error } = await matchService.invite(target.user_id, s.id);
    setSending(false);
    setTarget(null);
    if (error) return Alert.alert('Could not invite', error);
    router.push({ pathname: '/match', params: { category: s.id } });
  };

  return (
    <View>
      <View style={styles.head}>
        <View style={styles.dot} />
        <Text style={styles.title}>Players online</Text>
        <Text style={styles.count}>{players.length}</Text>
      </View>
      {players.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Nobody else is online right now. Pick a subject and search, or check back soon.</Text></View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {players.map((p) => (
            <View key={p.user_id} style={styles.card}>
              <Avatar name={p.name} uri={p.avatar_url} size={52} tone="neutral" />
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.meta}>{p.busy ? 'In a match' : p.games_played > 0 ? `${p.wins}/${p.games_played} wins` : 'New player'}</Text>
              <Button title={p.busy ? 'Busy' : 'Invite'} size="sm" variant={p.busy ? 'outline' : 'primary'} disabled={p.busy || playable.length === 0} onPress={() => setTarget(p)} />
            </View>
          ))}
        </ScrollView>
      )}

      <Modal transparent animationType="slide" visible={!!target} onRequestClose={() => setTarget(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => !sending && setTarget(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Invite {target?.name} to play</Text>
            <Text style={styles.sheetSub}>Choose a subject</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {playable.map((s) => (
                <TouchableOpacity key={s.id} style={styles.opt} disabled={sending} onPress={() => send(s)}>
                  <Text style={styles.optText}>{s.name}</Text>
                  <Text style={styles.optGo}>Invite</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Cancel" variant="ghost" fullWidth onPress={() => setTarget(null)} disabled={sending} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.success },
  title: { flex: 1, color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800' },
  count: { color: Colors.textSecondary, fontSize: Typography.size.md, fontWeight: '700' },
  empty: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 19 },
  row: { gap: Spacing.md, paddingBottom: Spacing.lg },
  card: { width: 120, alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  name: { color: Colors.text, fontSize: Typography.size.sm, fontWeight: '700', marginTop: 4 },
  meta: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginBottom: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,8,50,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl },
  sheetTitle: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800' },
  sheetSub: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginBottom: Spacing.md, marginTop: 2 },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  optText: { color: Colors.text, fontSize: Typography.size.md, fontWeight: '600' },
  optGo: { color: Colors.primary, fontWeight: '800' },
});
