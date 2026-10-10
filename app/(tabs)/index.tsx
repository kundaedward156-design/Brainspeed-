/**
 * Home — banners + competitions list
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { bannersService } from '@/services/banners';
import { competitionsService } from '@/services/competitions';
import { useAuth } from '@/contexts/AuthContext';
import type { Banner, Competition } from '@/types';

const WIDTH = Dimensions.get('window').width;

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, c] = await Promise.all([
      bannersService.listActive(),
      competitionsService.listActive(),
    ]);
    setBanners(b.data);
    setCompetitions(c.data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading…" />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      contentStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.hello}>Hello{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</Text>
          <Text style={styles.sub}>Pick a quiz and compete</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bell}>
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {banners.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / (WIDTH - Spacing.xxl * 2));
            setBannerIndex(i);
          }}
          style={styles.bannerScroll}
        >
          {banners.map((b) => (
            <View key={b.id} style={styles.bannerCard}>
              {b.image_url ? (
                <Image source={{ uri: b.image_url }} style={styles.bannerImage} resizeMode="cover" />
              ) : (
                <View style={[styles.bannerImage, styles.bannerPlaceholder]}>
                  <Text style={styles.bannerTitle}>{b.title}</Text>
                </View>
              )}
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle} numberOfLines={2}>{b.title}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <View key={i} style={[styles.dot, i === bannerIndex && styles.dotActive]} />
          ))}
        </View>
      ) : null}

      <Text style={styles.section}>Competitions</Text>
      {competitions.length === 0 ? (
        <EmptyState
          icon="flash-outline"
          title="No competitions yet"
          message="Check back soon for new quizzes."
        />
      ) : (
        competitions.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.compCard}
            activeOpacity={0.85}
            onPress={() => router.push(`/competition/${c.id}`)}
          >
            <View style={styles.compIcon}>
              <Ionicons name="flash" size={22} color={Colors.goldDark} />
            </View>
            <View style={styles.compText}>
              <Text style={styles.compTitle} numberOfLines={2}>{c.title}</Text>
              <Text style={styles.compMeta}>
                {c.reward != null ? `Reward: ${c.reward}` : 'Quiz competition'}
                {c.category?.name ? ` · ${c.category.name}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  hello: { color: Colors.text, fontSize: Typography.size.xxl, fontWeight: '800' },
  sub: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginTop: 2 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bannerScroll: { marginBottom: Spacing.sm },
  bannerCard: {
    width: WIDTH - Spacing.xxl * 2,
    height: 150,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginRight: Spacing.md,
    backgroundColor: Colors.navy,
    ...Shadows.card,
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: {
    backgroundColor: Colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bannerTitle: { color: Colors.white, fontWeight: '700', fontSize: Typography.size.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: Spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.borderStrong },
  dotActive: { backgroundColor: Colors.gold, width: 16 },
  section: {
    color: Colors.text,
    fontSize: Typography.size.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  compCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  compIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  compText: { flex: 1 },
  compTitle: { color: Colors.text, fontWeight: '700', fontSize: Typography.size.md },
  compMeta: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 3 },
});
