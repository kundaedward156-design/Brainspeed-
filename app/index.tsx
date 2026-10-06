/**
 * Splash / Welcome — matches product screenshot (dark navy + energy + gold CTA)
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/Logo';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { AppConfig } from '@/constants/config';

export default function SplashScreen() {
  const router = useRouter();
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Screen theme="dark" contentStyle={styles.content} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#06101F', '#0A1F45', '#0A1628']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Energy streaks */}
      <View style={styles.streak1} />
      <View style={styles.streak2} />
      <View style={styles.streak3} />

      <Animated.View
        style={[
          styles.center,
          { opacity, transform: [{ scale }, { translateY: slide }] },
        ]}
      >
        <View style={styles.logoGlow}>
          <LogoMark size="lg" />
        </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    marginBottom: Spacing.xl,
    shadowColor: Colors.gold,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  brand: {
    color: Colors.white,
    fontSize: Typography.size.hero,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandGold: { color: Colors.gold },
  slogan: {
    color: Colors.whiteMuted,
    fontSize: Typography.size.md,
    marginTop: Spacing.md,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.xxl,
  },
  streak1: {
    position: 'absolute',
    top: '18%',
    left: -40,
    width: 180,
    height: 3,
    backgroundColor: 'rgba(245,197,24,0.25)',
    transform: [{ rotate: '-25deg' }],
  },
  streak2: {
    position: 'absolute',
    top: '28%',
    right: -20,
    width: 140,
    height: 2,
    backgroundColor: 'rgba(43,123,255,0.35)',
    transform: [{ rotate: '20deg' }],
  },
  streak3: {
    position: 'absolute',
    bottom: '22%',
    left: '10%',
    width: 200,
    height: 2,
    backgroundColor: 'rgba(245,197,24,0.15)',
    transform: [{ rotate: '-12deg' }],
  },
});
