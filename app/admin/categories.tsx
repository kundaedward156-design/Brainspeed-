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
import { categoriesService } from '@/services/categories';
import type { Category } from '@/types';

export default function AdminCategories() {
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('grid-outline');
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await categoriesService.list();
    setList(res.data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const resetForm = () => {
    setName('');
    setIcon('grid-outline');
    setEditId(null);
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter a category name.');
      return;
    }
    setSaving(true);
    if (editId) {
      const { error } = await categoriesService.update(editId, {
        name: name.trim(),
        icon: icon.trim() || null,
      });
      setSaving(false);
      if (error) {
        Alert.alert('Error', error);
        return;
      }
      Alert.alert('Saved', 'Category updated.');
    } else {
      const { error } = await categoriesService.create({
        name: name.trim(),
        icon: icon.trim() || null,
        sort_order: list.length,
      });
      setSaving(false);
      if (error) {
        Alert.alert('Error', error);
        return;
      }
      Alert.alert('Created', 'Category added.');
    }
    resetForm();
    load();
  };

  const onEdit = (c: Category) => {
    setEditId(c.id);
    setName(c.name);
    setIcon(c.icon || 'grid-outline');
  };

  const onDelete = (c: Category) => {
    Alert.alert('Delete category?', c.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await categoriesService.remove(c.id);
          if (error) Alert.alert('Error', error);
          else load();
        },
      },
    ]);
  };

  const move = async (c: Category, dir: -1 | 1) => {
    const idx = list.findIndex((x) => x.id === c.id);
    const swap = list[idx + dir];
    if (!swap) return;
    await Promise.all([
      categoriesService.update(c.id, { sort_order: swap.sort_order }),
      categoriesService.update(swap.id, { sort_order: c.sort_order }),
    ]);
    load();
  };

  return (
    <Screen
      scroll
      contentStyle={{}}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
    >
      <Header title="Categories" showBack />
      <Card style={styles.card}>
        <Text style={styles.label}>{editId ? 'Edit category' : 'Add category'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Icon name (e.g. flash-outline)"
          placeholderTextColor={Colors.textMuted}
          value={icon}
          onChangeText={setIcon}
        />
        <Button title={editId ? 'Update' : 'Add Category'} onPress={onSave} loading={saving} fullWidth />
        {editId ? (
          <Button title="Cancel edit" variant="ghost" onPress={resetForm} fullWidth style={{ marginTop: 8 }} />
        ) : null}
      </Card>

      {loading && list.length === 0 ? (
        <LoadingState />
      ) : (
        list.map((c, i) => (
          <View key={c.id} style={styles.row}>
            <Ionicons name={(c.icon as any) || 'grid-outline'} size={22} color={Colors.gold} />
            <Text style={styles.rowTitle}>{c.name}</Text>
            <TouchableOpacity onPress={() => move(c, -1)} disabled={i === 0}>
              <Ionicons name="arrow-up" size={20} color={i === 0 ? Colors.textMuted : Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => move(c, 1)} disabled={i === list.length - 1}>
              <Ionicons name="arrow-down" size={20} color={i === list.length - 1 ? Colors.textMuted : Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onEdit(c)}>
              <Ionicons name="create-outline" size={20} color={Colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(c)}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
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
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  rowTitle: { flex: 1, color: Colors.text, fontWeight: '600' },
});
