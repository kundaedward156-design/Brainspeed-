import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LinkRow } from '@/components/ui/LinkRow';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { AppConfig } from '@/constants/config';
import { authService } from '@/services/auth';
import { adminService } from '@/services/admin';
import { profilesService } from '@/services/profiles';
import { useAuth } from '@/contexts/AuthContext';
import { useLinks, openLink, openSupport } from '@/hooks/useLinks';
import { toLocalZm } from '@/utils/phone';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const links = useLinks();
  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
      adminService.isAdmin().then(setIsAdmin);
    }, [refresh])
  );

  const toggleOnline = async (value: boolean) => {
    if (!profile) return;
    const { error } = await profilesService.update(profile.id, { appear_online: value });
    if (error) return Alert.alert('Could not save', 'Please try again.');
    refresh();
  };

  const logout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await authService.logout(); router.replace('/intro'); } },
    ]);

  const played = profile?.games_played ?? 0;
  const wins = profile?.wins ?? 0;
  const rate = played > 0 ? Math.round((wins / played) * 100) : 0;

  return (
    <Screen scroll>
      <Header title="Profile" />

      <View style={styles.top}>
        <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={84} />
        <Text style={styles.name}>{profile?.full_name || 'Player'}</Text>
        <Text style={styles.contact}>{profile?.phone ? toLocalZm(profile.phone) : profile?.email}</Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Played" value={played} />
        <Stat label="Wins" value={wins} />
        <Stat label="Win rate" value={`${rate}%`} />
        <Stat label="Points" value={profile?.total_score ?? 0} />
      </View>

      <View style={styles.onlineRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.onlineTitle}>Show me as online</Text>
          <Text style={styles.onlineHint}>Other players can see you in a subject and invite you to a duel.</Text>
        </View>
        <Switch value={profile?.appear_online !== false} onValueChange={toggleOnline} trackColor={{ true: Colors.primary }} />
      </View>

      <Text style={styles.section}>Account</Text>
      <View style={styles.card}>
        <LinkRow icon="person-outline" label="Edit profile" onPress={() => router.push('/settings')} />
        <LinkRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
        <LinkRow icon="wallet-outline" label="Wallet & transactions" onPress={() => router.push('/(tabs)/wallet')} last={!isAdmin} />
        {isAdmin ? <LinkRow icon="shield-checkmark-outline" label="Admin dashboard" hint="Manage players, questions and payments" onPress={() => router.push('/admin')} last /> : null}
      </View>

      <Text style={styles.section}>Community & legal</Text>
      <View style={styles.card}>
        <LinkRow icon="paper-plane-outline" label="Telegram community" onPress={() => openLink(links.telegram_url, 'Telegram community')} />
        <LinkRow icon="logo-whatsapp" label="WhatsApp" onPress={() => openLink(links.whatsapp_url, 'WhatsApp')} />
        <LinkRow icon="document-text-outline" label="Privacy Policy" onPress={() => openLink(links.privacy_url, 'Privacy Policy')} />
        <LinkRow icon="reader-outline" label="Terms of Service" onPress={() => openLink(links.terms_url, 'Terms of Service')} />
        <LinkRow icon="mail-outline" label="Contact support" hint={links.support_email || undefined} onPress={() => openSupport(links.support_email)} last />
      </View>

      <Button title="Log out" variant="outline" fullWidth onPress={logout} style={{ marginTop: Spacing.sm }} />
      <Text style={styles.version}>{AppConfig.name}</Text>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  onlineTitle: { color: Colors.text, fontSize: Typography.size.md, fontWeight: '700' },
  onlineHint: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 2, lineHeight: 16 },
  top: { alignItems: 'center', marginBottom: Spacing.xl },
  name: { color: Colors.text, fontSize: Typography.size.xxl, fontWeight: '800', marginTop: Spacing.md },
  contact: { color: Colors.textSecondary, marginTop: 4 },
  stats: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.lg, marginBottom: Spacing.xl },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: Colors.primary, fontSize: Typography.size.xl, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2, fontWeight: '600' },
  section: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl },
  version: { color: Colors.textMuted, textAlign: 'center', fontSize: Typography.size.xs, marginTop: Spacing.lg, marginBottom: Spacing.lg },
});
