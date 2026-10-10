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

  const hasImage = Boolean(imageUri?.trim());
  const canSave = Boolean(title.trim()) && (editId ? true : hasImage) && !saving;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await bannersService.listAll();
    if (res.error) {
      // soft-fail list
    }
    setList(res.data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload banners.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setImageUri(res.assets[0].uri);
    }
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
    if (!editId && !hasImage) {
      Alert.alert('Image required', 'Upload a banner image before saving.');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        const { error } = await bannersService.update(editId, {
          title: title.trim(),
          link_url: link.trim() || null,
          // only re-upload if local file (not already https from existing banner)
          imageUri: imageUri && !imageUri.startsWith('http') ? imageUri : imageUri?.startsWith('http') ? imageUri : null,
        });
        if (error) {
          Alert.alert('Save failed', error);
          return;
        }
        Alert.alert('Saved', 'Banner updated.');
      } else {
        const { error } = await bannersService.create({
          title: title.trim(),
          link_url: link.trim() || null,
          imageUri: imageUri!,
          sort_order: list.length,
          active: true,
        });
        if (error) {
          Alert.alert('Save failed', error);
          return;
        }
        Alert.alert('Created', 'Banner uploaded and saved.');
      }
      reset();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: Banner) => {
    const active = (b as any).active ?? (b as any).is_active ?? false;
    const { error } = await bannersService.update(b.id, { active: !active });
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
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Link URL (optional)"
          placeholderTextColor={Colors.textMuted}
          value={link}
          onChangeText={setLink}
        />

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.previewEmpty}>
            <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.previewHint}>No image yet — required for new banners</Text>
          </View>
        )}

        <Button
          title={imageUri ? 'Change image' : 'Upload image'}
          variant="outline"
          size="sm"
          onPress={pick}
          style={{ marginBottom: Spacing.md }}
        />

        <Button
          title={saving ? 'Saving…' : editId ? 'Update banner' : 'Save banner'}
          onPress={onSave}
          loading={saving}
          disabled={!canSave}
          fullWidth
        />
        {!hasImage && !editId ? (
          <Text style={styles.warn}>Upload an image before saving.</Text>
        ) : null}
        {editId ? (
          <Button title="Cancel" variant="ghost" onPress={reset} fullWidth style={{ marginTop: 8 }} />
        ) : null}
      </Card>

      {loading && list.length === 0 ? (
        <LoadingState />
      ) : (
        list.map((b, i) => {
          const active = (b as any).active ?? (b as any).is_active ?? false;
          return (
            <View key={b.id} style={styles.row}>
              {b.image_url ? (
                <Image source={{ uri: b.image_url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: Colors.surfaceMuted }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{b.title}</Text>
                <Text style={styles.meta}>
                  {active ? 'Active' : 'Hidden'} · order {b.sort_order}
                </Text>
              </View>
              <Switch value={Boolean(active)} onValueChange={() => toggleActive(b)} trackColor={{ true: Colors.gold }} />
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
                <Ionicons name="create-outline" size={20} color={Colors.goldDark} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(b)}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.lg },
  label: { color: Colors.text, fontWeight: '700', marginBottom: Spacing.md },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  preview: {
    width: '100%',
    height: 140,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
  },
  previewEmpty: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  previewHint: { color: Colors.textMuted, fontSize: Typography.size.xs },
  warn: {
    color: Colors.error,
    fontSize: Typography.size.xs,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumb: { width: 48, height: 36, borderRadius: 6 },
  rowTitle: { color: Colors.text, fontWeight: '600', fontSize: Typography.size.sm },
  meta: { color: Colors.textMuted, fontSize: 11 },
});
