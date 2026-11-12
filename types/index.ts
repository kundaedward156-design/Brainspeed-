/**
 * Domain types — match live Supabase schema (do not change DB)
 */

export type UserRole = 'player' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role?: UserRole;
  wins?: number;
  losses?: number;
  total_score?: number;
  balance_zmw?: number;
  draws?: number;
  games_played?: number;
  correct_answers?: number;
  push_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  sort_order: number;
}

export interface Competition {
  id: string;
  quiz_id?: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
  status?: string;
  player1_score?: number;
  player2_score?: number;
  winner_id?: string | null;
  entry_fee_zmw?: number;
  platform_fee_zmw?: number;
  prize_zmw?: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  // legacy fields for compatibility
  title?: string;
  reward?: number | string | null;
  category?: Category | null;
}

export interface QuizQuestion {
  id: string;
  competition_id: string;
  question: string;
  options: string[];
  position: number;
}

export interface Banner {
  id: string;
  title: string;
  image_url?: string | null;
  link_url?: string | null;
  destination?: string | null;
  sort_order?: number;
  priority?: number;
  active?: boolean;
  is_active?: boolean;
}

export interface CompetitionEntry {
  competition_id: string;
  user_id: string;
  score: number;
  profiles?: { full_name?: string; email?: string } | null;
}

export interface LeaderboardRow {
  user_id?: string;
  full_name?: string;
  score?: number;
  rank?: number;
  [key: string]: unknown;
}

export interface Reward {
  id: string;
  title: string;
  amount_zmw: number;
  image_url?: string | null;
  published: boolean;
}

export interface AppSetting {
  key: string;
  value: Record<string, unknown> | null;
}

export interface CompetitionRulesSetting {
  text?: string;
}

export interface ScoringSetting {
  points_per_correct?: number;
}

export interface MaintenanceSetting {
  enabled?: boolean;
  message?: string;
}


export interface AppNotification {
  id: string;
  user_id?: string | null;
  title: string;
  body: string;
  type?: string;
  is_read?: boolean;
  data?: Record<string, unknown> | null;
  created_at?: string;
}

export interface CompetitionResult {
  competition_id: string;
  score?: number;
  rank?: number;
  [key: string]: unknown;
}

export interface Question {
  id: string;
  text?: string;
  options?: string[];
  [key: string]: unknown;
}

export interface Quiz {
  id: string;
  title: string;
  category_id?: string | null;
  question_ids?: string[];
  question_count?: number;
  entry_fee_zmw?: number;
  is_active?: boolean;
  created_at?: string;
}

// ───────────── Server-driven match & wallet types ─────────────

export interface AppLinks {
  telegram_url: string;
  privacy_url: string;
  terms_url: string;
  support_email: string;
  whatsapp_url: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url?: string | null;
  games_played: number;
  wins: number;
  points: number;
}

export interface WinnerEntry {
  name: string;
  avatar_url?: string | null;
  prize: number;
  completed_at: string;
}

export interface LeaderboardData {
  top: LeaderboardEntry[];
  winners: WinnerEntry[];
  updated_at?: string;
}

export interface WalletEntry {
  id: string;
  type: 'deposit' | 'withdraw' | 'entry_fee' | 'entry_refund' | 'prize' | string;
  amount: number;
  status: string;
  created_at: string;
  detail?: string | null;
}

export interface MatchPlayerLive {
  name?: string;
  avatar_url?: string | null;
  score?: number;
  answered?: boolean;
  selected?: number | null;
  correct?: boolean | null;
  points?: number | null;
  correct_index?: number | null;
}

export interface MatchState {
  status: 'idle' | 'searching' | 'pending_accept' | 'active' | 'completed';
  server_time: number;
  competition_id?: string;
  // searching
  waited_s?: number;
  fee?: number;
  // pending_accept
  prize?: number;
  deadline?: number;
  i_accepted?: boolean;
  // active
  index?: number;
  total?: number;
  question_started_at?: number;
  question_seconds?: number;
  question?: { id: string; text: string; image_url?: string | null; options: string[] };
  me?: MatchPlayerLive;
  opponent?: MatchPlayerLive;
  last_answer?: { index: number; selected: number; correct: boolean; correct_index: number; points: number; time_ms: number };
}

export interface MatchResultPlayer {
  id: string;
  name: string;
  avatar_url?: string | null;
  score: number;
  correct: number;
  time_ms: number;
}

export interface MatchResult {
  competition_id: string;
  is_draw: boolean;
  winner_id?: string | null;
  prize: number;
  total_questions: number;
  me: MatchResultPlayer;
  opponent: MatchResultPlayer;
}
