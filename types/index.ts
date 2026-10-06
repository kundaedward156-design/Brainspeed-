/**
 * Domain types — ids are UUID strings from Supabase
 */

export type UserRole = 'player' | 'admin';

export interface Profile {
  id: string; // UUID = auth.users.id
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  wins: number;
  losses: number;
  total_score: number;
  balance_zmw: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Question {
  id: string;
  category_id: string;
  text: string;
  image_url: string | null;
  options: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit_sec: number;
  points: number;
  is_active: boolean;
  created_at: string;
}

export interface Quiz {
  id: string;
  title: string;
  category_id: string;
  question_ids: string[];
  question_count: number;
  entry_fee_zmw: number;
  is_active: boolean;
  created_at: string;
}

export type CompetitionStatus =
  | 'waiting'
  | 'matched'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Competition {
  id: string;
  quiz_id: string;
  player1_id: string;
  player2_id: string | null;
  status: CompetitionStatus;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  entry_fee_zmw: number;
  platform_fee_zmw: number;
  prize_zmw: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Answer {
  id: string;
  competition_id: string;
  player_id: string;
  question_id: string;
  selected_index: number | null;
  is_correct: boolean;
  time_taken_ms: number;
  points_earned: number;
  created_at: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  amount_zmw: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RewardTransaction {
  id: string;
  user_id: string;
  competition_id: string | null;
  reward_id: string | null;
  type: 'win' | 'deposit' | 'withdrawal' | 'bonus' | 'entry_fee';
  amount_zmw: number;
  balance_after_zmw: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  destination: string | null;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  type: 'competition' | 'reward' | 'system' | 'promo';
  is_read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface AppSettings {
  competition_rules: string;
  scoring_config: Record<string, unknown>;
  reward_config: Record<string, unknown>;
  maintenance_mode: boolean;
  min_entry_fee_zmw: number;
  max_entry_fee_zmw: number;
}

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export interface CompetitionResult {
  competition_id: string;
  is_winner: boolean;
  my_score: number;
  opponent_score: number;
  correct_count: number;
  incorrect_count: number;
  avg_speed_ms: number;
  prize_zmw: number;
}
