import type { Competition, Answer, CompetitionResult, Question } from '@/types';
import { supabase } from '@/services/supabase';

function asQuestionRows(data: unknown): Question[] {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const rawOptions = r.options;
    const options = Array.isArray(rawOptions)
      ? rawOptions.map((o) => String(o))
      : [];
    return {
      id: String(r.id ?? ''),
      category_id: String(r.category_id ?? ''),
      text: String(r.text ?? ''),
      image_url: (r.image_url as string | null) ?? null,
      options,
      difficulty: (r.difficulty as Question['difficulty']) ?? 'medium',
      time_limit_sec: Number(r.time_limit_sec ?? 15),
      points: Number(r.points ?? 10),
      is_active: r.is_active == null ? true : Boolean(r.is_active),
      created_at: String(r.created_at ?? ''),
    };
  });
}

export const competitionsService = {
  async findOrCreateMatch(
    quizId: string
  ): Promise<{ data: Competition | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data, error } = await supabase.rpc('find_or_create_match', {
      p_quiz_id: quizId,
    });
    if (error) return { data: null, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { data: (row as Competition) ?? null, error: null };
  },

  async getCompetitionQuestions(
    competitionId: string
  ): Promise<{ data: Question[]; error: string | null }> {
    if (!supabase) return { data: [], error: 'Not connected' };
    const { data, error } = await supabase.rpc('get_competition_questions', {
      p_competition_id: competitionId,
    });
    if (error) return { data: [], error: error.message };
    return { data: asQuestionRows(data), error: null };
  },

  async getById(id: string): Promise<{ data: Competition | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase.from('competitions').select('*').eq('id', id).maybeSingle();
    return { data: (data as Competition) ?? null, error: error?.message ?? null };
  },

  async submitAnswer(
    competitionId: string,
    questionId: string,
    selectedIndex: number | null,
    timeTakenMs: number
  ): Promise<{ data: Answer | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) return { data: null, error: 'Please log in first.' };

    const { data, error } = await supabase
      .from('answers')
      .insert({
        competition_id: competitionId,
        player_id: userId,
        question_id: questionId,
        selected_index: selectedIndex,
        time_taken_ms: timeTakenMs,
      })
      .select()
      .maybeSingle();

    return { data: (data as Answer) ?? null, error: error?.message ?? null };
  },

  async getResult(
    competitionId: string
  ): Promise<{ data: CompetitionResult | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) return { data: null, error: null };

    const { data: c, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .maybeSingle();
    if (error || !c) return { data: null, error: error?.message ?? null };

    const isP1 = c.player1_id === userId;
    const myScore = isP1 ? c.player1_score : c.player2_score;
    const opponentScore = isP1 ? c.player2_score : c.player1_score;
    const isWinner = c.winner_id === userId;

    const { data: answers } = await supabase
      .from('answers')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('player_id', userId);

    const list = answers ?? [];
    const correct = list.filter((a: Answer) => a.is_correct).length;
    const incorrect = list.filter((a: Answer) => !a.is_correct).length;
    const avg =
      list.length > 0
        ? list.reduce((s: number, a: Answer) => s + (a.time_taken_ms || 0), 0) / list.length
        : 0;

    return {
      data: {
        competition_id: competitionId,
        is_winner: Boolean(isWinner),
        my_score: myScore ?? 0,
        opponent_score: opponentScore ?? 0,
        correct_count: correct,
        incorrect_count: incorrect,
        avg_speed_ms: avg,
        prize_zmw: isWinner ? Number(c.prize_zmw ?? 0) : 0,
      },
      error: null,
    };
  },

  async listRecent(
    userId: string,
    limit = 10
  ): Promise<{ data: Competition[]; error: string | null }> {
    if (!supabase || !userId) return { data: [], error: null };
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data: (data as Competition[]) ?? [], error: error?.message ?? null };
  },

  subscribeToCompetition(id: string, onUpdate: (c: Competition) => void): () => void {
    if (!supabase) return () => {};
    const channel = supabase
      .channel(`competition:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competitions', filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) onUpdate(payload.new as Competition);
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  },
};
