import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { InviteListener } from '@/components/InviteListener';

// Keep the native splash up until the animated splash (app/index.tsx) has drawn its first frame.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="intro" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="match" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="results" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="admin" />
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="deposit" />
          <Stack.Screen name="withdraw" />
          <Stack.Screen name="maintenance" />
        </Stack>
        <InviteListener />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
});
