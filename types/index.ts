/**
 * Domain types — match live Supabase schema (do not change DB)
 */

export type UserRole = 'player' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  role?: UserRole;
  wins?: number;
  losses?: number;
  total_score?: number;
  balance_zmw?: number;
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
