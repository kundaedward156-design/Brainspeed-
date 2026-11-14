/** Mounted once at the app root: shows an invitation pop-up wherever the player is. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';
import { useHeartbeat } from '@/hooks/usePresence';
import { presenceService } from '@/services/presence';
import { matchService } from '@/services/match';
import { supabase } from '@/services/supabase';
import type { IncomingInvite } from '@/types';

export function InviteListener() {
  const { profile, refresh } = useAuth();
  const router = useRouter();
  const [invite, setInvite] = useState<IncomingInvite | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const dismissed = useRef<Set<string>>(new Set());
  const uid = profile?.id;

  useHeartbeat(!!uid);

  const poll = useCallback(async () => {
    if (!uid) return;
    const list = await presenceService.myInvites();
    const next = list.find((i) => !dismissed.current.has(i.id)) ?? null;
    setInvite((cur) => (cur?.id === next?.id ? cur : next));
    if (next) setLeft(next.seconds_left);
  }, [uid]);

  useEffect(() => {
    if (!uid) { setInvite(null); return; }
    poll();
    const t = setInterval(poll, 4000);
    const ch = supabase
      ?.channel(`invites-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_invites', filter: `to_user=eq.${uid}` }, () => poll())
      .subscribe();
    return () => { clearInterval(t); if (ch) supabase?.removeChannel(ch); };
  }, [uid, poll]);

  useEffect(() => {
    if (!invite) return;
    const t = setInterval(() => setLeft((s) => {
      if (s <= 1) { dismissed.current.add(invite.id); setInvite(null); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [invite?.id]);

  if (!invite) return null;

  const respond = async (accept: boolean) => {
    setBusy(accept ? 'accept' : 'decline');
    const { error } = await matchService.respondInvite(invite.id, accept);
    setBusy(null);
    dismissed.current.add(invite.id);
    setInvite(null);
    if (error) { Alert.alert(accept ? 'Could not join' : 'Could not decline', error); return; }
    refresh();
    if (accept) router.push({ pathname: '/match', params: { category: invite.category_id ?? '' } });
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => respond(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Avatar name={invite.from_name} uri={invite.from_avatar} size={72} />
          <Text style={styles.title}>{invite.from_name} invited you</Text>
          <Text style={styles.sub}>{invite.category_name ?? 'A quiz duel'} · 10 questions</Text>
          <View style={styles.money}>
            <View style={styles.cell}><Text style={styles.label}>Your entry</Text><Text style={styles.value}>{formatMoney(invite.fee)}</Text></View>
            <View style={styles.cell}><Text style={styles.label}>Winner takes</Text><Text style={[styles.value, { color: Colors.success }]}>{formatMoney(invite.prize)}</Text></View>
          </View>
          <Text style={styles.timer}>Expires in {left}s</Text>
          <Button title="Accept & play" icon="flash" size="lg" fullWidth loading={busy === 'accept'} disabled={busy !== null} onPress={() => respond(true)} />
          <Button title="Decline" variant="ghost" fullWidth loading={busy === 'decline'} disabled={busy !== null} onPress={() => respond(false)} style={{ marginTop: 6 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,8,50,0.7)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: { width: '100%', maxWidth: 380, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center' },
  title: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800', marginTop: Spacing.md, textAlign: 'center' },
  sub: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginTop: 4 },
  money: { flexDirection: 'row', alignSelf: 'stretch', marginVertical: Spacing.lg, backgroundColor: Colors.background, borderRadius: BorderRadius.md, paddingVertical: Spacing.md },
  cell: { flex: 1, alignItems: 'center' },
  label: { color: Colors.textSecondary, fontSize: Typography.size.xs },
  value: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800', marginTop: 2 },
  timer: { color: Colors.textMuted, fontSize: Typography.size.sm, marginBottom: Spacing.md },
});
