import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { competitionsService } from '@/services/competitions';
import { categoriesService } from '@/services/categories';
import type { Category, Competition } from '@/types';

export default function AdminQuizzes() {
  const [list, setList] = useState<Competition[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, cat] = await Promise.all([
      competitionsService.listAll(),
      categoriesService.list(),
    ]);
    setList(c.data);
    setCategories(cat.data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const reset = () => {
    setTitle('');
    setReward('');
    setStartsAt('');
    setEndsAt('');
    setCategoryId(null);
    setEditId(null);
  };

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Enter a quiz title.');
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      reward: reward.trim() || null,
      starts_at: startsAt.trim() || null,
      ends_at: endsAt.trim() || null,
      category_id: categoryId,
    };
    if (editId) {
      const { error } = await competitionsService.update(editId, payload);
      setSaving(false);
      if (error) return Alert.alert('Error', error);
      Alert.alert('Saved', 'Quiz updated.');
    } else {
      const { error } = await competitionsService.create(payload);
      setSaving(false);
      if (error) return Alert.alert('Error', error);
      Alert.alert('Created', 'Quiz created. Add questions next.');
    }
    reset();
    load();
  };

  const onEdit = (c: Competition) => {
    setEditId(c.id);
    setTitle(c.title);
    setReward(c.reward != null ? String(c.reward) : '');
    setStartsAt(c.starts_at ? c.starts_at.slice(0, 16) : '');
    setEndsAt(c.ends_at ? c.ends_at.slice(0, 16) : '');
    setCategoryId(c.category_id ?? null);
  };

  const onDelete = (c: Competition) => {
    Alert.alert('Delete quiz?', c.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await competitionsService.remove(c.id);
          if (error) Alert.alert('Error', error);
          else load();
        },
      },
    ]);
  };

  return (
    <Screen
      scroll
      contentStyle={{}}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
    >
      <Header title="Quizzes" showBack />
      <Card style={styles.card}>
        <Text style={styles.label}>{editId ? 'Edit quiz' : 'Create Quiz'}</Text>
        <TextInput style={styles.input} placeholder="Title" placeholderTextColor={Colors.textMuted} value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Reward (e.g. 50)" placeholderTextColor={Colors.textMuted} value={reward} onChangeText={setReward} keyboardType="decimal-pad" />
        <TextInput style={styles.input} placeholder="Starts at (YYYY-MM-DDTHH:mm)" placeholderTextColor={Colors.textMuted} value={startsAt} onChangeText={setStartsAt} />
        <TextInput style={styles.input} placeholder="Ends at (YYYY-MM-DDTHH:mm)" placeholderTextColor={Colors.textMuted} value={endsAt} onChangeText={setEndsAt} />
        <Text style={styles.small}>Category</Text>
        <View style={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, !categoryId && styles.chipOn]}
            onPress={() => setCategoryId(null)}
          >
            <Text style={styles.chipText}>None</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, categoryId === cat.id && styles.chipOn]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={styles.chipText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title={editId ? 'Update Quiz' : 'Create Quiz'} onPress={onSave} loading={saving} fullWidth />
        {editId ? <Button title="Cancel" variant="ghost" onPress={reset} fullWidth style={{ marginTop: 8 }} /> : null}
      </Card>

      {loading && list.length === 0 ? (
        <LoadingState />
      ) : (
        list.map((c) => (
          <View key={c.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{c.title}</Text>
              <Text style={styles.meta}>
                {c.category?.name ? `${c.category.name} · ` : ''}
                Reward: {c.reward ?? '—'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onEdit(c)}>
              <Ionicons name="create-outline" size={22} color={Colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(c)}>
              <Ionicons name="trash-outline" size={22} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.lg },
  label: { color: Colors.text, fontWeight: '700', marginBottom: Spacing.md },
  small: { color: Colors.textSecondary, marginBottom: Spacing.sm, fontSize: Typography.size.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipOn: { backgroundColor: Colors.gold },
  chipText: { color: Colors.text, fontWeight: '600', fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  rowTitle: { color: Colors.text, fontWeight: '700' },
  meta: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 2 },
});
