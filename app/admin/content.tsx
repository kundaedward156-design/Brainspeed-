import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Typography } from '@/constants/theme';

const ITEMS = [
  {
    title: 'Categories',
    desc: 'Add, edit, reorder categories',
    icon: 'grid-outline' as const,
    href: '/admin/categories',
  },
  {
    title: 'Quizzes',
    desc: 'Create quizzes, set reward & dates',
    icon: 'list-outline' as const,
    href: '/admin/quizzes',
  },
  {
    title: 'Questions',
    desc: 'Add options & mark correct answer',
    icon: 'help-circle-outline' as const,
    href: '/admin/questions',
  },
  {
    title: 'Banners',
    desc: 'Upload images, reorder, toggle active',
    icon: 'images-outline' as const,
    href: '/admin/banners-manage',
  },
];

export default function AdminContent() {
  const router = useRouter();
  return (
    <Screen scroll contentStyle={{}}>
      <Header title="Content" />
      <Text style={styles.hint}>Manage quiz content for the player app.</Text>
      {ITEMS.map((item) => (
        <TouchableOpacity key={item.title} onPress={() => router.push(item.href as any)} activeOpacity={0.85}>
          <Card style={styles.card}>
            <View style={styles.row}>
              <Ionicons name={item.icon} size={28} color={Colors.gold} />
              <View style={styles.text}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textMuted, fontSize: Typography.size.sm, marginBottom: Spacing.lg },
  card: { marginBottom: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, marginLeft: Spacing.md },
  title: { color: Colors.text, fontWeight: '700', fontSize: Typography.size.md },
  desc: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 2 },
});
