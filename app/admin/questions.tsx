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
import type { Competition, QuizQuestion } from '@/types';

export default function AdminQuestions() {
  const [quizzes, setQuizzes] = useState<Competition[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    const res = await competitionsService.listAll();
    setQuizzes(res.data);
    setLoading(false);
  }, []);

  const loadQuestions = useCallback(async (quizId: string) => {
    const res = await competitionsService.listQuestions(quizId);
    setQuestions(res.data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadQuizzes();
    }, [loadQuizzes])
  );

  const selectQuiz = async (id: string) => {
    setSelectedQuiz(id);
    setEditId(null);
    await loadQuestions(id);
  };

  const resetForm = () => {
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrect('');
    setEditId(null);
  };

  const setOptionAt = (i: number, v: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const addOption = () => setOptions((prev) => [...prev, '']);
  const removeOption = (i: number) => {
    if (options.length <= 2) {
      Alert.alert('Need options', 'Keep at least 2 options.');
      return;
    }
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSave = async () => {
    if (!selectedQuiz) {
      Alert.alert('Pick a quiz', 'Select a quiz first.');
      return;
    }
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2) {
      Alert.alert('Incomplete', 'Enter a question and at least 2 options.');
      return;
    }
    if (!correct.trim() || !clean.includes(correct.trim())) {
      Alert.alert('Correct answer', 'Correct answer must exactly match one option.');
      return;
    }
    setSaving(true);
    if (editId) {
      const { error } = await competitionsService.updateQuestion(editId, {
        question: question.trim(),
        options: clean,
        correct_answer: correct.trim(),
      });
      setSaving(false);
      if (error) return Alert.alert('Error', error);
      Alert.alert('Saved', 'Question updated.');
    } else {
      const { error } = await competitionsService.addQuestion({
        competition_id: selectedQuiz,
        question: question.trim(),
        options: clean,
        position: questions.length,
        correct_answer: correct.trim(),
      });
      setSaving(false);
      if (error) return Alert.alert('Error', error);
      Alert.alert('Added', 'Question and answer key saved.');
    }
    resetForm();
    loadQuestions(selectedQuiz);
  };

  const onEdit = (q: QuizQuestion) => {
    setEditId(q.id);
    setQuestion(q.question);
    setOptions(q.options.length ? q.options : ['', '']);
    setCorrect('');
  };

  const onDelete = (q: QuizQuestion) => {
    Alert.alert('Delete question?', q.question.slice(0, 60), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await competitionsService.deleteQuestion(q.id);
          if (error) Alert.alert('Error', error);
          else if (selectedQuiz) loadQuestions(selectedQuiz);
        },
      },
    ]);
  };

  return (
    <Screen
      scroll
      contentStyle={{}}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => {
            loadQuizzes();
            if (selectedQuiz) loadQuestions(selectedQuiz);
          }}
          tintColor={Colors.gold}
        />
      }
    >
      <Header title="Questions" showBack />
      <Text style={styles.hint}>Pick a quiz, then add questions. Correct answer is stored only in quiz_answer_key.</Text>

      <Text style={styles.section}>Quiz</Text>
      <View style={styles.chips}>
        {quizzes.map((q) => (
          <TouchableOpacity
            key={q.id}
            style={[styles.chip, selectedQuiz === q.id && styles.chipOn]}
            onPress={() => selectQuiz(q.id)}
          >
            <Text style={styles.chipText} numberOfLines={1}>{q.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedQuiz ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.label}>{editId ? 'Edit question' : 'Add Question'}</Text>
            <TextInput
              style={[styles.input, { minHeight: 72 }]}
              placeholder="Question text"
              placeholderTextColor={Colors.textMuted}
              value={question}
              onChangeText={setQuestion}
              multiline
            />
            {options.map((opt, i) => (
              <View key={i} style={styles.optRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={Colors.textMuted}
                  value={opt}
                  onChangeText={(t) => setOptionAt(i, t)}
                />
                <TouchableOpacity onPress={() => setCorrect(opt.trim())} style={styles.markBtn}>
                  <Ionicons
                    name={correct === opt.trim() && opt.trim() ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={correct === opt.trim() && opt.trim() ? Colors.success : Colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeOption(i)}>
                  <Ionicons name="close" size={22} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <Button title="Add option row" variant="outline" size="sm" onPress={addOption} style={{ marginBottom: Spacing.md }} />
            <TextInput
              style={styles.input}
              placeholder="Correct answer (must match an option exactly)"
              placeholderTextColor={Colors.textMuted}
              value={correct}
              onChangeText={setCorrect}
            />
            <Button title={editId ? 'Update Question' : 'Add Question'} onPress={onSave} loading={saving} fullWidth />
            {editId ? <Button title="Cancel" variant="ghost" onPress={resetForm} fullWidth style={{ marginTop: 8 }} /> : null}
          </Card>

          {questions.map((q) => (
            <View key={q.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{q.question}</Text>
                <Text style={styles.meta}>{q.options.length} options · pos {q.position}</Text>
              </View>
              <TouchableOpacity onPress={() => onEdit(q)}>
                <Ionicons name="create-outline" size={22} color={Colors.gold} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(q)}>
                <Ionicons name="trash-outline" size={22} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : loading ? (
        <LoadingState />
      ) : (
        <Text style={styles.hint}>Select a quiz above to manage its questions.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textMuted, marginBottom: Spacing.md, fontSize: Typography.size.sm },
  section: { color: Colors.text, fontWeight: '700', marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    maxWidth: '100%',
  },
  chipOn: { backgroundColor: Colors.gold },
  chipText: { color: Colors.text, fontWeight: '600', fontSize: 12 },
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
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  markBtn: { padding: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  rowTitle: { color: Colors.text, fontWeight: '600' },
  meta: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 2 },
});
