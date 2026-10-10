import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { authService } from '@/services/auth';
import { adminService } from '@/services/admin';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile: ctxProfile, refresh } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(ctxProfile);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    await refresh();
    const { profile: p } = await authService.getCurrentProfile();
    setProfile(p);
    const admin = await adminService.isAdmin();
    setIsAdmin(admin);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const name = profile?.full_name ?? 'Your profile';
  const email = profile?.email ?? '—';
  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;
  const totalScore = profile?.total_score ?? 0;
  const avatarUrl = profile?.avatar_url || null;

  return (
    <Screen scroll>
      <Header
        title="Profile"
        right={
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        }
      />

      <View style={styles.avatarBlock}>
        <TouchableOpacity style={styles.avatar} onPress={() => router.push('/settings')} activeOpacity={0.85}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImg}
              key={avatarUrl}
            />
          ) : (
            <Ionicons name="person" size={48} color={Colors.textMuted} />
          )}
        </TouchableOpacity>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Text style={styles.changePhoto}>
            {avatarUrl ? 'Change photo' : 'Add profile photo'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{wins}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{losses}</Text>
          <Text style={styles.statLabel}>Losses</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{totalScore}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </Card>
      </View>

      <Card style={styles.menuCard}>
        <MenuRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
        <MenuRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        {isAdmin ? (
          <MenuRow icon="shield-outline" label="Admin Dashboard" onPress={() => router.push('/admin')} />
        ) : null}
      </Card>
    </Screen>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={22} color={Colors.textSecondary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatarBlock: { alignItems: 'center', marginBottom: Spacing.xxl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  name: { color: Colors.text, fontSize: Typography.size.xxl, fontWeight: '700' },
  email: { color: Colors.textSecondary, marginTop: 4 },
  changePhoto: {
    color: Colors.goldDark,
    fontWeight: '700',
    marginTop: Spacing.sm,
    fontSize: Typography.size.sm,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
  statValue: { color: Colors.goldDark, fontSize: Typography.size.xxl, fontWeight: '800' },
  statLabel: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 4 },
  menuCard: { paddingVertical: Spacing.sm },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  menuLabel: { flex: 1, color: Colors.text, fontWeight: '600' },
});
