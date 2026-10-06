/**
 * Home — light UI; all lists from Supabase services
 */
import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PromoBanner } from '@/components/home/PromoBanner';
import { SectionHeader } from '@/components/home/SectionHeader';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { AppConfig } from '@/constants/config';
import { categoriesService } from '@/services/categories';
import { quizzesService } from '@/services/quizzes';
import { competitionsService } from '@/services/competitions';
import { bannersService } from '@/services/banners';
import { rewardsService } from '@/services/rewards';
import { authService } from '@/services/auth';
import type { Category, Quiz, Competition, Banner, Profile } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Quiz[]>([]);
  const [recent, setRecent] = useState<Competition[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profileRes = await authService.getCurrentProfile();
      const userId = profileRes.profile?.id ?? '';
      const [banRes, catRes, featRes, recentRes, balRes] = await Promise.all([
        bannersService.listActive(),
        categoriesService.listActive(),
        quizzesService.listFeatured(),
        competitionsService.listRecent(userId),
        rewardsService.getBalance(userId),
      ]);
      setProfile(profileRes.profile);
      setBanners(banRes.data);
      setCategories(catRes.data);
      setFeatured(featRes.data);
      setRecent(recentRes.data);
      setBalance(balRes.balance_zmw);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hello{firstName ? ',' : ''}</Text>
          <Text style={styles.userName}>{firstName ?? 'Welcome'}</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="person-circle-outline" size={28} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <PromoBanner banners={banners} loading={loading} />

      <Card style={styles.competeCard}>
        <Text style={styles.competeTitle}>Compete Now</Text>
        <Text style={styles.competeSub}>
          Match with an opponent and battle for {AppConfig.currencySymbol} rewards.
        </Text>
        <Button
          title="Start Match"
          onPress={() => router.push('/(tabs)/compete')}
          size="md"
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      <SectionHeader title="Categories" />
      {categories.length === 0 ? (
        <EmptyState icon="grid-outline" title="No categories yet" message="New categories will show up here." />
      ) : (
        <View style={styles.categoryRow}>
          {categories.map((c) => (
            <Card key={c.id} style={styles.categoryCard} onPress={() => router.push('/(tabs)/compete')}>
              {c.image_url ? (
                <Image source={{ uri: c.image_url }} style={styles.catImg} />
              ) : (
                <View style={styles.catPlaceholder}>
                  <Ionicons name="grid" size={22} color={Colors.blue} />
                </View>
              )}
              <Text style={styles.categoryName} numberOfLines={1}>{c.name}</Text>
            </Card>
          ))}
        </View>
      )}

      <SectionHeader title="Featured Quizzes" />
      {featured.length === 0 ? (
        <EmptyState icon="star-outline" title="No featured quizzes" message="Featured matches will show up here." />
      ) : (
        featured.map((q) => (
          <Card key={q.id} style={{ marginBottom: Spacing.md }} onPress={() => router.push('/(tabs)/compete')}>
            <Text style={styles.quizTitle}>{q.title}</Text>
            <Text style={styles.quizMeta}>
              {AppConfig.currencySymbol}{q.entry_fee_zmw} · {q.question_count} questions
            </Text>
          </Card>
        ))
      )}

      <SectionHeader title="Recent Competitions" />
      {recent.length === 0 ? (
        <EmptyState icon="time-outline" title="No matches yet" message="Your recent competitions will appear here." />
      ) : (
        recent.map((c) => (
          <Card key={c.id} style={{ marginBottom: Spacing.md }}>
            <Text style={styles.quizTitle}>{c.status === 'completed' ? 'Completed' : c.status.replace('_', ' ')}</Text>
            <Text style={styles.quizMeta}>Score {c.player1_score} – {c.player2_score}</Text>
          </Card>
        ))
      )}

      <SectionHeader title="Rewards" actionLabel="See all" onAction={() => router.push('/(tabs)/rewards')} />
      <Card style={styles.rewardPreview} onPress={() => router.push('/(tabs)/rewards')}>
        <View style={styles.walletIcon}>
          <Ionicons name="wallet" size={24} color={Colors.goldDark} />
        </View>
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <Text style={styles.rewardLabel}>Your balance</Text>
          <Text style={styles.rewardValue}>
            {AppConfig.currencySymbol} {balance.toFixed(2)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.lg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: { color: Colors.textSecondary, fontSize: Typography.size.sm },
  userName: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '700' },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: Spacing.sm },
  competeCard: { marginBottom: Spacing.xl },
  competeTitle: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '700' },
  competeSub: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginTop: 4 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
  categoryCard: { width: '47%', minHeight: 88 },
  catImg: { width: 40, height: 40, borderRadius: 10, marginBottom: Spacing.sm },
  catPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.blueMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  categoryName: { color: Colors.text, fontWeight: '600' },
  quizTitle: { color: Colors.text, fontWeight: '600' },
  quizMeta: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginTop: 4 },
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardLabel: { color: Colors.textSecondary, fontSize: Typography.size.sm },
  rewardValue: { color: Colors.text, fontSize: Typography.size.xxl, fontWeight: '800' },
});
