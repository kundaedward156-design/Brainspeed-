import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useLocalSearchParams } from 'expo-router';

export default function MaintenanceScreen() {
  const { message } = useLocalSearchParams<{ message?: string }>();
  return (
    <Screen contentStyle={styles.wrap}>
      <Text style={styles.title}>Under maintenance</Text>
      <Text style={styles.body}>
        {message || 'Brainspeed is temporarily unavailable. Please try again later.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  title: { color: Colors.text, fontSize: Typography.size.xxl, fontWeight: '800', marginBottom: Spacing.md },
  body: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
