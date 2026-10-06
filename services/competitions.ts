import type { Competition, Answer, CompetitionResult } from '@/types';
import { supabase } from '@/services/supabase';

export const competitionsService = {
  async findOrCreateMatch(
    quizId: string
  ): Promise<{ data: Competition | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) return { data: null, error: 'Please log in first.' };

    // Prefer joining an open waiting match for this quiz
    const { data: waiting } = await supabase
      .from('competitions')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('status', 'waiting')
      .is('player2_id', null)
      .neq('player1_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (waiting) {
      const { data, error } = await supabase
        .from('competitions')
        .update({ player2_id: userId, status: 'matched' })
        .eq('id', waiting.id)
        .select()
        .maybeSingle();
      return { data: (data as Competition) ?? null, error: error?.message ?? null };
    }

    const { data: quiz } = await supabase
      .from('quizzes')
      .select('entry_fee_zmw')
      .eq('id', quizId)
      .maybeSingle();
    const entry = Number(quiz?.entry_fee_zmw ?? 22);
    const platform = Math.round(entry * 2 * 0.0909 * 100) / 100;
    const prize = entry * 2 - platform;

    const { data, error } = await supabase
      .from('competitions')
      .insert({
        quiz_id: quizId,
        player1_id: userId,
        status: 'waiting',
        entry_fee_zmw: entry,
        platform_fee_zmw: platform,
        prize_zmw: prize,
        player1_score: 0,
        player2_score: 0,
      })
      .select()
      .maybeSingle();

    return { data: (data as Competition) ?? null, error: error?.message ?? null };
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

    // Prefer secure RPC in production; direct insert allowed if RLS + trigger scores
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
      supabase.removeChannel(channel);
    };
  },
};
