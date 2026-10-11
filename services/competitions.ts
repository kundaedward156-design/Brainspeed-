import type { Competition, QuizQuestion } from '@/types';
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
  /** List quizzes the current user has not yet completed */
  async listAvailableQuizzes(userId: string): Promise<{ data: any[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) return { data: [], error: error.message };

    // Exclude quizzes the user already finished
    const { data: played } = await supabase
      .from('competitions')
      .select('quiz_id')
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .in('status', ['completed', 'finished']);

    const playedIds = new Set((played || []).map((p: any) => p.quiz_id));
    const available = (quizzes || []).filter((q: any) => !playedIds.has(q.id));
    return { data: available, error: null };
  },

  /** Find a waiting competition for the quiz or create one as player1 */
  async findOrCreateMatch(quizId: string, userId: string, entryFee: number): Promise<{ data: Competition | null; error: string | null }> {
    if (!supabase) return { data: null, error: 'Not connected' };

    // Check balance
    const { data: profile } = await supabase.from('profiles').select('balance_zmw').eq('id', userId).single();
    if (!profile || Number(profile.balance_zmw) < entryFee) {
      return { data: null, error: 'Insufficient balance. Deposit funds first.' };
    }

    // Look for waiting competition (player2 null)
    const { data: waiting } = await supabase
      .from('competitions')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('status', 'waiting')
      .is('player2_id', null)
      .neq('player1_id', userId)
      .limit(1)
      .maybeSingle();

    if (waiting) {
      // Join as player2 and deduct fee
      const { error: joinErr } = await supabase
        .from('competitions')
        .update({ player2_id: userId, status: 'active', started_at: new Date().toISOString() })
        .eq('id', waiting.id);
      if (joinErr) return { data: null, error: joinErr.message };

      // Deduct both fees (simplified – in production use Edge Function)
      await supabase.rpc('deduct_balance', { uid: userId, amount: entryFee }).catch(() => {});
      return { data: { ...waiting, player2_id: userId, status: 'active' }, error: null };
    }

    // Create new as player1
    const { data: created, error } = await supabase
      .from('competitions')
      .insert({
        quiz_id: quizId,
        player1_id: userId,
        status: 'waiting',
        entry_fee_zmw: entryFee,
        prize_zmw: entryFee * 2 - 4, // simple platform fee
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };

    await supabase.rpc('deduct_balance', { uid: userId, amount: entryFee }).catch(() => {});
    return { data: created as Competition, error: null };
  },

  async getById(id: string): Promise<{ data: Competition | null; error: string | null }> {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase.from('competitions').select('*').eq('id', id).maybeSingle();
    return { data: data as Competition, error: error?.message ?? null };
  },

  /** Load questions for a competition via its quiz */
  async listQuestions(competitionId: string): Promise<{ data: QuizQuestion[]; error: string | null }> {
    if (!supabase) return { data: [], error: null };
    const { data: comp } = await supabase.from('competitions').select('quiz_id').eq('id', competitionId).single();
    if (!comp?.quiz_id) return { data: [], error: 'No quiz linked' };

    const { data: quiz } = await supabase.from('quizzes').select('question_ids').eq('id', comp.quiz_id).single();
    const ids = quiz?.question_ids || [];
    if (!ids.length) return { data: [], error: null };

    const { data: qs, error } = await supabase
      .from('questions')
      .select('id, text, options, correct_index')
      .in('id', ids);
    const rows = (qs || []).map((r: any, i: number) => ({
      id: r.id,
      competition_id: competitionId,
      question: r.text || '',
      options: normalizeOptions(r.options),
      position: i,
    }));
    return { data: rows, error: error?.message ?? null };
  },

  async submitAnswer(competitionId: string, questionId: string, selectedIndex: number, userId: string): Promise<{ correct: boolean; error: string | null }> {
    if (!supabase) return { correct: false, error: 'Not connected' };
    const { data: q } = await supabase.from('questions').select('correct_index').eq('id', questionId).single();
    const correct = q?.correct_index === selectedIndex;
    const points = correct ? 1 : 0;

    await supabase.from('answers').insert({
      competition_id: competitionId,
      player_id: userId,
      question_id: questionId,
      selected_index: selectedIndex,
      is_correct: correct,
      points_earned: points,
    });

    return { correct, error: null };
  },

  async finishCompetition(competitionId: string, userId: string, finalScore: number): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Not connected' };
    const { data: comp } = await supabase.from('competitions').select('*').eq('id', competitionId).single();
    if (!comp) return { error: 'Competition not found' };

    const isP1 = comp.player1_id === userId;
    const update: any = isP1 ? { player1_score: finalScore } : { player2_score: finalScore };

    // If both scores present, determine winner
    const p1 = isP1 ? finalScore : (comp.player1_score || 0);
    const p2 = !isP1 ? finalScore : (comp.player2_score || 0);
    if (comp.player1_id && comp.player2_id && (isP1 ? comp.player2_score != null : comp.player1_score != null)) {
      update.status = 'completed';
      update.completed_at = new Date().toISOString();
      if (p1 > p2) update.winner_id = comp.player1_id;
      else if (p2 > p1) update.winner_id = comp.player2_id;
      // award prize to winner (simplified)
      if (update.winner_id) {
        const prize = Number(comp.prize_zmw || 0);
        await supabase.rpc('credit_balance', { uid: update.winner_id, amount: prize }).catch(() => {});
        // create notification
        await supabase.from('notifications').insert({
          user_id: update.winner_id,
          title: 'You won!',
          body: `You won the quiz and received K${prize}.`,
          type: 'win',
        });
      }
    }

    await supabase.from('competitions').update(update).eq('id', competitionId);
    return { error: null };
  },
};
