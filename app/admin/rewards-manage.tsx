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
import { rewardsService } from '@/services/rewards';
import type { Reward } from '@/types';

export default function AdminRewards() {
  const [list, setList] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const hasImage = Boolean(imageUri?.trim());
  const canSave =
    Boolean(title.trim()) && Boolean(amount.trim()) && (editId ? true : hasImage) && !saving;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await rewardsService.listAll();
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
      Alert.alert('Permission needed', 'Allow photo library access to upload reward images.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets[0]?.uri) setImageUri(res.assets[0].uri);
  };

  const reset = () => {
    setTitle('');
    setAmount('');
    setImageUri(null);
    setEditId(null);
  };

  const onSave = async () => {
    if (!title.trim() || !amount.trim()) {
      Alert.alert('Required', 'Title and amount are required.');
      return;
    }
    const amt = Number(amount);
    if (Number.isNaN(amt)) {
      Alert.alert('Invalid amount', 'Enter a number.');
      return;
    }
    if (!editId && !hasImage) {
      Alert.alert('Image required', 'Upload a reward image before saving.');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        const { error } = await rewardsService.update(editId, {
          title: title.trim(),
          amount_zmw: amt,
          imageUri: imageUri || null,
        });
        if (error) {
          Alert.alert('Save failed', error);
          return;
        }
        Alert.alert('Saved', 'Reward updated.');
      } else {
        const { error } = await rewardsService.create({
          title: title.trim(),
          amount_zmw: amt,
          imageUri: imageUri!,
          published: true,
        });
        if (error) {
          Alert.alert('Save failed', error);
          return;
        }
        Alert.alert('Created', 'Reward saved.');
      }
      reset();
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      scroll
      contentStyle={{}}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
    >
      <Header title="Rewards" showBack />
      <Card style={styles.card}>
        <Text style={styles.label}>{editId ? 'Edit reward' : 'Add reward'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Amount (ZMW)"
          placeholderTextColor={Colors.textMuted}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.previewEmpty}>
            <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.previewHint}>No image yet — required for new rewards</Text>
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
          title={saving ? 'Saving…' : editId ? 'Update reward' : 'Save reward'}
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
        list.map((r) => {
          const published = (r as any).published ?? (r as any).is_active ?? false;
          return (
            <View key={r.id} style={styles.row}>
              {r.image_url ? (
                <Image source={{ uri: r.image_url }} style={styles.thumb} />
              ) : (
                <View style={styles.thumb} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{r.title}</Text>
                <Text style={styles.meta}>K{r.amount_zmw}</Text>
              </View>
              <Switch
                value={Boolean(published)}
                onValueChange={async (v) => {
                  const { error } = await rewardsService.update(r.id, { published: v });
                  if (error) Alert.alert('Error', error);
                  else load();
                }}
                trackColor={{ true: Colors.gold }}
              />
              <TouchableOpacity
                onPress={() => {
                  setEditId(r.id);
                  setTitle(r.title);
                  setAmount(String(r.amount_zmw));
                  setImageUri(r.image_url || null);
                }}
              >
                <Ionicons name="create-outline" size={20} color={Colors.goldDark} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Delete?', r.title, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        const { error } = await rewardsService.remove(r.id);
                        if (error) Alert.alert('Error', error);
                        else load();
                      },
                    },
                  ])
                }
              >
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
  thumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.surfaceMuted },
  rowTitle: { color: Colors.text, fontWeight: '600' },
  meta: { color: Colors.goldDark, fontSize: Typography.size.xs },
});
