import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { authService } from '@/services/auth';

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: 'person-outline' as const, label: 'Edit profile' },
      { icon: 'mail-outline' as const, label: 'Email' },
    ],
  },
  {
    title: 'Notifications',
    items: [{ icon: 'notifications-outline' as const, label: 'Push notifications' }],
  },
  {
    title: 'Security',
    items: [{ icon: 'lock-closed-outline' as const, label: 'Change password' }],
  },
  {
    title: 'Support',
    items: [
      { icon: 'help-circle-outline' as const, label: 'Help' },
      { icon: 'document-text-outline' as const, label: 'Terms of Service' },
      { icon: 'shield-checkmark-outline' as const, label: 'Privacy Policy' },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  const onLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Header title="Settings" showBack />
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card style={styles.card}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}
                onPress={() => {}}
              >
                <Ionicons name={item.icon} size={22} color={Colors.textSecondary} />
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      ))}
      <TouchableOpacity style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  card: { paddingVertical: 0, paddingHorizontal: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { flex: 1, color: Colors.text, fontSize: Typography.size.md, marginLeft: Spacing.md },
  logout: { alignItems: 'center', paddingVertical: Spacing.xl, marginBottom: Spacing.xxl },
  logoutText: { color: Colors.error, fontSize: Typography.size.lg, fontWeight: '700' },
});
