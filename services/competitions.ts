import type { Competition, CompetitionEntry, LeaderboardRow, QuizQuestion } from '@/types';
import { supabase } from '@/services/supabase';

function normalizeOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((o) => String(o));
    } catch {
      /* ignore */
    }
  }
  return [];
}

export const competitionsService = {
  async listActive(): Promise<{ data: Competition[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('competitions')
      .select('*, category:categories(*)')
      .order('starts_at', { ascending: false });
    return { data: (data as Competition[]) ?? [], error: error?.message ?? null };
  },

  async listAll(): Promise<{ data: Competition[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('competitions')
      .select('*, category:categories(*)')
      .order('starts_at', { ascending: false });
    return { data: (data as Competition[]) ?? [], error: error?.message ?? null };
  },

  async getById(id: string): Promise<{ data: Competition | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase
      .from('competitions')
      .select('*, category:categories(*)')
      .eq('id', id)
      .maybeSingle();
    return { data: (data as Competition) ?? null, error: error?.message ?? null };
  },

  async create(payload: {
    title: string;
    reward?: number | string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    category_id?: string | null;
  }): Promise<{ data: Competition | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase
      .from('competitions')
      .insert({
        title: payload.title,
        reward: payload.reward ?? null,
        starts_at: payload.starts_at ?? null,
        ends_at: payload.ends_at ?? null,
        category_id: payload.category_id ?? null,
      })
      .select()
      .maybeSingle();
    return { data: (data as Competition) ?? null, error: error?.message ?? null };
  },

  async update(
    id: string,
    payload: Partial<{
      title: string;
      reward: number | string | null;
      starts_at: string | null;
      ends_at: string | null;
      category_id: string | null;
    }>
  ): Promise<{ data: Competition | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase
      .from('competitions')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: (data as Competition) ?? null, error: error?.message ?? null };
  },

  async remove(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.from('competitions').delete().eq('id', id);
    return { error: error?.message ?? null };
  },

  async join(competitionId: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { error } = await supabase.rpc('join_competition', {
      p_competition_id: competitionId,
    });
    return { error: error?.message ?? null };
  },

  async submitAnswer(
    competitionId: string,
    questionId: string,
    answer: string
  ): Promise<{ correct: boolean | null; error: string | null }> {
    if (!supabase) return { correct: null, error: 'Not connected' };
    const { data, error } = await supabase.rpc('submit_answer', {
      p_competition_id: competitionId,
      p_question_id: questionId,
      p_answer: answer,
    });
    if (error) return { correct: null, error: error.message };
    return { correct: Boolean(data), error: null };
  },

  async getLeaderboard(
    competitionId: string,
    limit = 20
  ): Promise<{ data: LeaderboardRow[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_competition_id: competitionId,
      p_limit: limit,
    });
    if (error) return { data: [], error: error.message };
    return { data: (data as LeaderboardRow[]) ?? [], error: null };
  },

  async listQuestions(
    competitionId: string
  ): Promise<{ data: QuizQuestion[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('id, competition_id, question, options, position')
      .eq('competition_id', competitionId)
      .order('position', { ascending: true });
    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      competition_id: String(r.competition_id),
      question: String(r.question ?? ''),
      options: normalizeOptions(r.options),
      position: Number(r.position ?? 0),
    }));
    return { data: rows, error: error?.message ?? null };
  },

  async addQuestion(payload: {
    competition_id: string;
    question: string;
    options: string[];
    position: number;
    correct_answer: string;
  }): Promise<{ data: QuizQuestion | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    if (!payload.options.includes(payload.correct_answer)) {
      return { data: null, error: 'Correct answer must exactly match one option.' };
    }
    const { data: q, error: qErr } = await supabase
      .from('quiz_questions')
      .insert({
        competition_id: payload.competition_id,
        question: payload.question,
        options: payload.options,
        position: payload.position,
      })
      .select('id, competition_id, question, options, position')
      .maybeSingle();
    if (qErr || !q) return { data: null, error: qErr?.message ?? 'Failed to add question' };

    const { error: keyErr } = await supabase.from('quiz_answer_key').insert({
      question_id: q.id,
      correct_answer: payload.correct_answer,
    });
    if (keyErr) {
      // best-effort cleanup
      await supabase.from('quiz_questions').delete().eq('id', q.id);
      return { data: null, error: keyErr.message };
    }

    return {
      data: {
        id: String(q.id),
        competition_id: String(q.competition_id),
        question: String(q.question ?? ''),
        options: normalizeOptions(q.options),
        position: Number(q.position ?? 0),
      },
      error: null,
    };
  },

  async updateQuestion(
    id: string,
    payload: {
      question?: string;
      options?: string[];
      position?: number;
      correct_answer?: string;
    }
  ): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const patch: Record<string, unknown> = {};
    if (payload.question !== undefined) patch.question = payload.question;
    if (payload.options !== undefined) patch.options = payload.options;
    if (payload.position !== undefined) patch.position = payload.position;
    if (Object.keys(patch).length) {
      const { error } = await supabase.from('quiz_questions').update(patch).eq('id', id);
      if (error) return { error: error.message };
    }
    if (payload.correct_answer !== undefined) {
      if (payload.options && !payload.options.includes(payload.correct_answer)) {
        return { error: 'Correct answer must exactly match one option.' };
      }
      const { error } = await supabase
        .from('quiz_answer_key')
        .upsert({ question_id: id, correct_answer: payload.correct_answer });
      if (error) return { error: error.message };
    }
    return { error: null };
  },

  async deleteQuestion(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    await supabase.from('quiz_answer_key').delete().eq('question_id', id);
    const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
    return { error: error?.message ?? null };
  },

  async listEntries(
    competitionId: string
  ): Promise<{ data: CompetitionEntry[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('competition_entries')
      .select('competition_id, user_id, score, profiles(full_name, email)')
      .eq('competition_id', competitionId)
      .order('score', { ascending: false });
    return { data: (data as CompetitionEntry[]) ?? [], error: error?.message ?? null };
  },

  async getMyEntry(
    competitionId: string,
    userId: string
  ): Promise<{ data: CompetitionEntry | null; error: string | null }> {
    if (!supabase || !userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('competition_entries')
      .select('competition_id, user_id, score')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .maybeSingle();
    return { data: (data as CompetitionEntry) ?? null, error: error?.message ?? null };
  },
};
