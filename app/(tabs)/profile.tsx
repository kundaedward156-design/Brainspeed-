import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
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

  const name = profile?.full_name ?? 'Player';
  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;
  const played = wins + losses;
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const totalScore = profile?.total_score ?? 0;
  const balance = Number(profile?.balance_zmw ?? 0);
  const avatarUrl = profile?.avatar_url || null;
  const initial = (name || 'E')[0].toUpperCase();

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.profileCard}>
        <LinearGradient
          colors={[Colors.gold, Colors.orange]}
          style={styles.avatarCircle}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarLetter}>{initial}</Text>
          )}
        </LinearGradient>
        <Text style={styles.name}>{name}</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push('/settings')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.gold, Colors.orange]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.editBtnGrad}
          >
            <Ionicons name="pencil" size={14} color="#000" />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Ionicons name="wallet-outline" size={18} color={Colors.gold} />
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
        </View>
        <Text style={styles.balanceValue}>ZMW {balance.toFixed(0)}</Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity
            style={styles.depositBtn}
            onPress={() => router.push('/deposit')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.gold, Colors.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGrad}
            >
              <Ionicons name="arrow-down" size={16} color="#000" />
              <Text style={styles.actionTextDark}>Deposit</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => router.push('/withdraw')}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up" size={16} color={Colors.text} />
            <Text style={styles.actionText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <Ionicons name="trophy-outline" size={18} color={Colors.gold} />
          <Text style={styles.statsTitle}>COMPETITION STATS</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatItem icon="game-controller-outline" value={String(played)} label="PLAYED" />
          <StatItem icon="ribbon-outline" value={String(wins)} label="WON" />
          <StatItem icon="close-circle-outline" value={String(losses)} label="LOST" />
          <StatItem icon="trending-up" value={`${winRate}%`} label="WIN RATE" />
          <StatItem icon="checkmark-circle-outline" value={String(totalScore)} label="CORRECT" />
          <StatItem icon="trophy" value={String(totalScore * 5)} label="POINTS" />
        </View>
      </View>

      {isAdmin && (
        <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')}>
          <Ionicons name="shield-outline" size={20} color={Colors.gold} />
          <Text style={styles.adminText}>Admin Dashboard</Text>
        </TouchableOpacity>
      )}
    </Screen>
  );
}

function StatItem({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={18} color={Colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingHorizontal: 4,
  },
  headerTitle: { color: Colors.text, fontSize: Typography.size.lg, fontWeight: '700' },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetter: { color: '#000', fontSize: 32, fontWeight: '800' },
  name: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '700', marginBottom: Spacing.md },
  editBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  editBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editBtnText: { color: '#000', fontWeight: '700', fontSize: Typography.size.sm },
  balanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  balanceLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: '600', letterSpacing: 1 },
  balanceValue: { color: Colors.text, fontSize: Typography.size.xxxl, fontWeight: '800', marginBottom: Spacing.md },
  balanceActions: { flexDirection: 'row', gap: 10 },
  depositBtn: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden' },
  actionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  actionTextDark: { color: '#000', fontWeight: '700' },
  withdrawBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  actionText: { color: Colors.text, fontWeight: '700' },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.lg },
  statsTitle: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: '600', letterSpacing: 1 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    width: '30%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: { color: Colors.text, fontWeight: '800', fontSize: Typography.size.lg, marginTop: 4 },
  statLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adminText: { color: Colors.gold, fontWeight: '700' },
});
