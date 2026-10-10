import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  Image,
  Switch,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { bannersService } from '@/services/banners';
import type { Banner } from '@/types';

export default function AdminBanners() {
  const [list, setList] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await bannersService.listAll();
    setList(res.data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]?.uri) setImageUri(res.assets[0].uri);
  };

  const reset = () => {
    setTitle('');
    setLink('');
    setImageUri(null);
    setEditId(null);
  };

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Enter a banner title.');
      return;
    }
    setSaving(true);
    if (editId) {
      const { error } = await bannersService.update(editId, {
        title: title.trim(),
        link_url: link.trim() || null,
        imageUri: imageUri,
      });
      setSaving(false);
      if (error) return Alert.alert('Error', error);
      Alert.alert('Saved', 'Banner updated.');
    } else {
      const { error } = await bannersService.create({
        title: title.trim(),
        link_url: link.trim() || null,
        imageUri,
        sort_order: list.length,
        active: true,
      });
      setSaving(false);
      if (error) return Alert.alert('Error', error);
      Alert.alert('Created', 'Banner uploaded and saved.');
    }
    reset();
    load();
  };

  const toggleActive = async (b: Banner) => {
    const { error } = await bannersService.update(b.id, { active: !b.active });
    if (error) Alert.alert('Error', error);
    else load();
  };

  const move = async (b: Banner, dir: -1 | 1) => {
    const idx = list.findIndex((x) => x.id === b.id);
    const swap = list[idx + dir];
    if (!swap) return;
    await Promise.all([
      bannersService.update(b.id, { sort_order: swap.sort_order }),
      bannersService.update(swap.id, { sort_order: b.sort_order }),
    ]);
    load();
  };

  const onDelete = (b: Banner) => {
    Alert.alert('Delete banner?', b.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await bannersService.remove(b.id);
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
      <Header title="Banners" showBack />
      <Card style={styles.card}>
        <Text style={styles.label}>{editId ? 'Edit banner' : 'Add banner'}</Text>
        <TextInput style={styles.input} placeholder="Title" placeholderTextColor={Colors.textMuted} value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Link URL (optional)" placeholderTextColor={Colors.textMuted} value={link} onChangeText={setLink} />
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
        <Button title={imageUri ? 'Change image' : 'Upload image'} variant="outline" size="sm" onPress={pick} style={{ marginBottom: Spacing.md }} />
        <Button title={editId ? 'Update' : 'Save banner'} onPress={onSave} loading={saving} fullWidth />
        {editId ? <Button title="Cancel" variant="ghost" onPress={reset} fullWidth style={{ marginTop: 8 }} /> : null}
      </Card>

      {loading && list.length === 0 ? (
        <LoadingState />
      ) : (
        list.map((b, i) => (
          <View key={b.id} style={styles.row}>
            {b.image_url ? (
              <Image source={{ uri: b.image_url }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{b.title}</Text>
              <Text style={styles.meta}>{b.active ? 'Active' : 'Hidden'} · order {b.sort_order}</Text>
            </View>
            <Switch value={b.active} onValueChange={() => toggleActive(b)} trackColor={{ true: Colors.gold }} />
            <TouchableOpacity onPress={() => move(b, -1)} disabled={i === 0}>
              <Ionicons name="arrow-up" size={18} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => move(b, 1)} disabled={i === list.length - 1}>
              <Ionicons name="arrow-down" size={18} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setEditId(b.id);
                setTitle(b.title);
                setLink(b.link_url || '');
                setImageUri(b.image_url || null);
              }}
            >
              <Ionicons name="create-outline" size={20} color={Colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(b)}>
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
  preview: { width: '100%', height: 120, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  thumb: { width: 48, height: 36, borderRadius: 6 },
  rowTitle: { color: Colors.text, fontWeight: '600', fontSize: Typography.size.sm },
  meta: { color: Colors.textSecondary, fontSize: 11 },
});
