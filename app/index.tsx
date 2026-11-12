/**
 * Entry screen: animated full-screen splash while we restore the session,
 * then route to the dashboard (signed in) or the intro (new visitor).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StatusBar, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AnimatedSplash } from '@/components/brand/AnimatedSplash';
import { authService } from '@/services/auth';
import { settingsService } from '@/services/settings';
import { adminService } from '@/services/admin';

const MIN_SPLASH_MS = 3000;

export default function Index() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(1)).current;
  const started = useRef(false);

  // Hide the native splash only once our own first frame is on screen (no flash).
  const onLayout = () => {
    SplashScreen.hideAsync().catch(() => {});
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const minimum = new Promise((r) => setTimeout(r, MIN_SPLASH_MS));
      const check = (async () => {
        try {
          const { profile } = await authService.getCurrentProfile();
          let maintenance: { enabled?: boolean; message?: string } = {};
          try {
            maintenance = (await settingsService.getMaintenance()).data;
          } catch { /* ignore */ }
          const isAdmin = profile ? await adminService.isAdmin() : false;
          return { profile, maintenance, isAdmin };
        } catch {
          return { profile: null, maintenance: {}, isAdmin: false };
        }
      })();

      const [, result] = await Promise.all([minimum, check]);

      Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        if (result.maintenance.enabled && !result.isAdmin) {
          router.replace({ pathname: '/maintenance', params: { message: result.maintenance.message || '' } });
        } else if (result.profile) {
          router.replace('/(tabs)');
        } else {
          router.replace('/intro');
        }
      });
    })();
  }, [fade, router]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <AnimatedSplash onLayout={onLayout} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EDE7FB' },
});
