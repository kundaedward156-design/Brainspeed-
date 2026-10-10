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
  title: string;
  reward?: number | string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  category_id?: string | null;
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
  sort_order: number;
  active: boolean;
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
  title?: string;
  [key: string]: unknown;
}
