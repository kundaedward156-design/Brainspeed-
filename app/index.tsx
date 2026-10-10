/**
 * Splash / Welcome — restores session if logged in, otherwise shows logo + CTA
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { AppConfig } from '@/constants/config';
import { authService } from '@/services/auth';

export default function SplashScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(28)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Restore session from AsyncStorage so user stays logged in on reopen
      try {
        const { profile } = await authService.getCurrentProfile();
        if (!mounted) return;
        if (profile) {
          router.replace('/(tabs)');
          return;
        }
      } catch {
        // ignore — show splash
      }
      if (mounted) setChecking(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (checking) return;

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, [checking, opacity, scale, slide, pulse]);

  if (checking) {
    return (
      <Screen theme="dark" contentStyle={styles.loadingContent} edges={['top', 'bottom']}>
        <LinearGradient
          colors={['#000000', '#06101F', '#0A1F2A']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Image source={require('@/assets/logo.png')} style={styles.logoSmall} resizeMode="contain" />
        <ActivityIndicator color="#22C55E" size="large" style={{ marginTop: Spacing.xl }} />
      </Screen>
    );
  }

  return (
    <Screen theme="dark" contentStyle={styles.content} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#000000', '#06101F', '#0A1F2A']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} />

      <Animated.View
        style={[
          styles.center,
          { opacity, transform: [{ scale }, { translateY: slide }] },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Image
            source={require('@/assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <Text style={styles.brand}>
          Brain<Text style={styles.brandGold}>speed</Text>
        </Text>
        <Text style={styles.slogan}>{AppConfig.slogan}</Text>
      </Animated.View>

      <Animated.View style={{ opacity, width: '100%', paddingBottom: Spacing.xl }}>
        <Button
          title="Continue  →"
          onPress={() => router.push('/intro')}
          size="lg"
          fullWidth
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing.massive,
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: Spacing.xl,
  },
  logoSmall: {
    width: 96,
    height: 96,
  },
  brand: {
    color: Colors.white,
    fontSize: Typography.size.hero,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandGold: { color: '#22C55E' },
  slogan: {
    color: Colors.whiteMuted,
    fontSize: Typography.size.md,
    marginTop: Spacing.md,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.xxl,
  },
});
