/**
 * Subjects (categories). The admin sets the name, icon, colour and optional cover image,
 * and sees how many of the 10 required questions each subject already has.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity, RefreshControl, Image, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { ACCENTS, SUBJECT_ICONS, subjectLook, type IconName } from '@/constants/subjects';
import { formatCount } from '@/utils/format';
import { categoriesService } from '@/services/categories';
import type { Subject } from '@/types';

export default function AdminCategories() {
  const router = useRouter();
  const [list, setList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<IconName>(SUBJECT_ICONS[0]);
  const [accent, setAccent] = useState(ACCENTS[0].key);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await categoriesService.listWithStats(true);
    if (res.error) Alert.alert('Could not load subjects', res.error);
    setList(res.data);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const reset = () => {
    setOpen(false); setEditId(null); setName(''); setDescription('');
    setIcon(SUBJECT_ICONS[0]); setAccent(ACCENTS[0].key); setImageUri(null);
  };

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo library access to upload a cover.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets?.[0]?.uri) setImageUri(res.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Enter the subject name.');
    setSaving(true);
    const body = { name: name.trim(), description: description.trim() || null, icon, accent };
    const { error } = editId
      ? await categoriesService.update(editId, { ...body, imageUri, removeImage: !imageUri })
      : await categoriesService.create({ ...body, imageUri, sort_order: list.length });
    setSaving(false);
    if (error) return Alert.alert('Error', error);
    reset();
    load();
  };

  const edit = (c: Subject) => {
    setEditId(c.id); setOpen(true); setName(c.name); setDescription(c.description || '');
    setIcon((c.icon as IconName) || subjectLook(c).icon); setAccent(c.accent || ACCENTS[0].key); setImageUri(c.image_url || null);
  };

  const remove = (c: Subject) =>
    Alert.alert('Delete subject?', `${c.name}. Its questions stay in the database but will no longer belong to a subject.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { const { error } = await categoriesService.remove(c.id); if (error) Alert.alert('Error', error); else load(); } },
    ]);

  const toggle = async (c: Subject) => {
    const { error } = await categoriesService.update(c.id, { is_active: !c.is_active });
    if (error) Alert.alert('Error', error); else load();
  };

  const move = async (c: Subject, dir: -1 | 1) => {
    const i = list.findIndex((x) => x.id === c.id);
    if (!list[i + dir]) return;
    const next = [...list];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setList(next);
    await Promise.all(next.map((x, idx) => (x.sort_order === idx ? null : categoriesService.update(x.id, { sort_order: idx }))));
    load();
  };

  const preview = subjectLook({ id: editId || name, name, icon, accent });

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}>
      <Header title="Subjects" showBack right={!open ? <TouchableOpacity onPress={() => setOpen(true)}><Ionicons name="add-circle" size={30} color={Colors.primary} /></TouchableOpacity> : undefined} />
      <Text style={styles.hint}>Each subject needs at least 10 active questions before players can compete in it.</Text>

      {open ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{editId ? 'Edit subject' : 'New subject'}</Text>
          <View style={styles.previewRow}>
            <View style={styles.preview}>
              {imageUri ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} /> : (
                <LinearGradient colors={preview.colors} style={[StyleSheet.absoluteFill, styles.center]}>
                  <Ionicons name={preview.icon} size={34} color="#fff" />
                </LinearGradient>
              )}
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Button title={imageUri ? 'Change cover image' : 'Upload cover image'} variant="outline" size="sm" icon="image-outline" onPress={pick} />
              {imageUri ? <Button title="Remove image" variant="ghost" size="sm" onPress={() => setImageUri(null)} /> : <Text style={styles.small}>Optional. Without one, the colour and icon below are used.</Text>}
            </View>
          </View>

          <TextInput style={styles.input} placeholder="Subject name (e.g. Science)" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
          <TextInput style={[styles.input, { height: 70 }]} multiline placeholder="Short description (optional)" placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} />

          <Text style={styles.label}>Colour</Text>
          <View style={styles.wrapRow}>
            {ACCENTS.map((a) => (
              <TouchableOpacity key={a.key} onPress={() => setAccent(a.key)} style={[styles.swatchRing, accent === a.key && styles.swatchRingOn]}>
                <LinearGradient colors={a.colors} style={styles.swatch} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Icon</Text>
          <View style={styles.wrapRow}>
            {SUBJECT_ICONS.map((n) => (
              <TouchableOpacity key={n} onPress={() => setIcon(n)} style={[styles.iconBtn, icon === n && styles.iconBtnOn]}>
                <Ionicons name={n} size={22} color={icon === n ? Colors.white : Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>

          <Button title={editId ? 'Save changes' : 'Add subject'} fullWidth loading={saving} onPress={save} style={{ marginTop: Spacing.lg }} />
          <Button title="Cancel" variant="ghost" fullWidth onPress={reset} />
        </View>
      ) : null}

      {loading && list.length === 0 ? <LoadingState /> : list.map((c, i) => {
        const look = subjectLook(c);
        const ready = c.playable;
        return (
          <View key={c.id} style={[styles.row, !c.is_active && { opacity: 0.55 }]}>
            <View style={styles.thumb}>
              {c.image_url ? <Image source={{ uri: c.image_url }} style={StyleSheet.absoluteFill} /> : (
                <LinearGradient colors={look.colors} style={[StyleSheet.absoluteFill, styles.center]}><Ionicons name={look.icon} size={22} color="#fff" /></LinearGradient>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{c.name}</Text>
              <Text style={[styles.rowMeta, !ready && { color: Colors.warning }]}>
                {c.questions}/{c.questions_needed} questions{ready ? ' · ready' : ' · needs more'} · {formatCount(c.played)} played
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: '/admin/questions', params: { category: c.id } })} hitSlop={8}><Ionicons name="help-circle-outline" size={22} color={Colors.primary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => move(c, -1)} disabled={i === 0} hitSlop={6}><Ionicons name="arrow-up" size={18} color={i === 0 ? Colors.border : Colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => move(c, 1)} disabled={i === list.length - 1} hitSlop={6}><Ionicons name="arrow-down" size={18} color={i === list.length - 1 ? Colors.border : Colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => toggle(c)} hitSlop={6}><Ionicons name={c.is_active ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => edit(c)} hitSlop={6}><Ionicons name="create-outline" size={20} color={Colors.primary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => remove(c)} hitSlop={6}><Ionicons name="trash-outline" size={20} color={Colors.error} /></TouchableOpacity>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginBottom: Spacing.lg, lineHeight: 19 },
  form: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  formTitle: { color: Colors.text, fontWeight: '800', fontSize: Typography.size.lg, marginBottom: Spacing.md },
  previewRow: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg },
  preview: { width: 84, height: 84, borderRadius: 22, overflow: 'hidden', backgroundColor: Colors.surfaceMuted },
  center: { alignItems: 'center', justifyContent: 'center' },
  small: { color: Colors.textMuted, fontSize: Typography.size.xs, lineHeight: 16 },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  label: { color: Colors.text, fontWeight: '700', marginBottom: Spacing.sm, marginTop: Spacing.xs },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.md },
  swatchRing: { padding: 3, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  swatchRingOn: { borderColor: Colors.primary },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconBtnOn: { backgroundColor: Colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  thumb: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.surfaceMuted },
  rowTitle: { color: Colors.text, fontWeight: '800', fontSize: Typography.size.md },
  rowMeta: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 2 },
});
