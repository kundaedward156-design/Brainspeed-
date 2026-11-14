import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { adminService, type AdminQuestion } from '@/services/admin';
import { categoriesService } from '@/services/categories';
import type { Subject } from '@/types';

const blank = { text: '', options: ['', '', '', ''], correct_index: 0, category_id: null as string | null };

export default function AdminQuestions() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [rows, setRows] = useState<AdminQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filter, setFilter] = useState<string>(params.category ? String(params.category) : 'all');
  const [editing, setEditing] = useState<(Partial<AdminQuestion> & typeof blank) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([adminService.listQuestions(), categoriesService.listWithStats(true)]);
    if (r.error) Alert.alert('Error', r.error);
    setRows(r.data);
    setSubjects(c.data);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!editing) return;
    const options = editing.options.map((o) => o.trim());
    if (!editing.text.trim()) return Alert.alert('Question', 'Write the question text.');
    if (!editing.category_id) return Alert.alert('Subject', 'Choose the subject this question belongs to, so players can be matched in it.');
    if (options.some((o) => !o)) return Alert.alert('Options', 'Fill in all four answer options.');
    setSaving(true);
    const { error } = await adminService.saveQuestion({ ...editing, text: editing.text.trim(), options, correct_index: editing.correct_index });
    setSaving(false);
    if (error) return Alert.alert('Error', error);
    setEditing(null);
    load();
  };

  const shown = rows.filter((q) => (filter === 'all' ? true : filter === 'none' ? !q.category_id : q.category_id === filter));
  const current = subjects.find((s) => s.id === filter);

  if (editing) {
    return (
      <Screen scroll keyboardAvoid>
        <Header title={editing.id ? 'Edit question' : 'New question'} showBack onBack={() => setEditing(null)} />
 <Text style={styles.label}>Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginBottom: Spacing.lg }}>
          {subjects.map((s) => (
            <TouchableOpacity key={s.id} onPress={() => setEditing({ ...editing, category_id: s.id })} style={[styles.chip, editing.category_id === s.id && styles.chipOn]}>
              <Text style={[styles.chipText, editing.category_id === s.id && styles.chipTextOn]}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Input label="Question" placeholder="Type the question" multiline value={editing.text} onChangeText={(v) => setEditing({ ...editing, text: v })} />
        <Text style={styles.label}>Answer options — tap the circle to mark the correct one</Text>
        {editing.options.map((o, i) => (
          <View key={i} style={styles.optRow}>
            <TouchableOpacity onPress={() => setEditing({ ...editing, correct_index: i })} hitSlop={10}>
              <Ionicons name={editing.correct_index === i ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={editing.correct_index === i ? Colors.success : Colors.textMuted} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Input placeholder={`Option ${String.fromCharCode(65 + i)}`} value={o} onChangeText={(v) => setEditing({ ...editing, options: editing.options.map((x, j) => (j === i ? v : x)) })} />
            </View>
          </View>
        ))}
        <Button title="Save question" size="lg" fullWidth loading={saving} onPress={save} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title="Questions" showBack right={<TouchableOpacity onPress={() => setEditing({ ...blank, category_id: filter !== 'all' && filter !== 'none' ? filter : null })}><Ionicons name="add-circle" size={30} color={Colors.primary} /></TouchableOpacity>} />
      <Text style={styles.hint}>Only active questions are used in matches. Players never see the correct answer until they have answered.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginBottom: Spacing.md }}>
        {[{ id: 'all', name: 'All' }, ...subjects.map((s) => ({ id: s.id, name: s.name })), { id: 'none', name: 'No subject' }].map((f) => (
          <TouchableOpacity key={f.id} onPress={() => setFilter(f.id)} style={[styles.chip, filter === f.id && styles.chipOn]}>
            <Text style={[styles.chipText, filter === f.id && styles.chipTextOn]}>{f.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {current ? (
        <Text style={[styles.count, !current.playable && { color: Colors.warning }]}>
          {current.name}: {current.questions} of {current.questions_needed} active questions{current.playable ? ' — ready for players' : ' — add more to open this subject'}
        </Text>
      ) : null}
      {shown.length === 0 ? (
        <EmptyState icon="help-circle-outline" title="No questions yet" message="Tap + to add your first question." />
      ) : (
        <View style={styles.list}>
          {shown.map((q, i) => (
            <TouchableOpacity key={q.id} style={[styles.row, i < shown.length - 1 && styles.divider]} onPress={() => setEditing({ id: q.id, category_id: q.category_id ?? null, text: q.text, options: [...(q.options || []), '', '', '', ''].slice(0, 4), correct_index: q.correct_index })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.qText} numberOfLines={2}>{q.text}</Text>
                <Text style={styles.ans}>Answer: {q.options?.[q.correct_index]}</Text>
                <Text style={styles.tag}>{subjects.find((s) => s.id === q.category_id)?.name ?? 'No subject'}</Text>
              </View>
              <Switch value={q.is_active} trackColor={{ true: Colors.primary }} onValueChange={async (v) => { await adminService.setQuestionActive(q.id, v); load(); }} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginBottom: Spacing.lg, lineHeight: 19 },
  label: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: '600', marginBottom: Spacing.md },
  optRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginTop: 2 },
  list: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  chips: { gap: 8, paddingRight: Spacing.lg },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontWeight: '700', fontSize: Typography.size.sm },
  chipTextOn: { color: Colors.white },
  count: { color: Colors.success, fontSize: Typography.size.sm, fontWeight: '700', marginBottom: Spacing.md },
  tag: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  qText: { color: Colors.text, fontWeight: '600' },
  ans: { color: Colors.success, fontSize: Typography.size.xs, marginTop: 3, fontWeight: '600' },
});
