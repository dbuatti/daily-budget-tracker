import { Module, UserBudgetConfig } from "./budget";

export interface WeeklyBudgetState {
  user_id: string;
  current_tokens: Module[];
  gear_travel_fund: number;
  annual_income?: number; // Added dedicated column
  last_reset_date: string; // ISO date string
  updated_at: string;
  config?: UserBudgetConfig;
}

export interface BudgetTransaction {
  user_id: string;
  amount: number;
  category_id?: string;
  description?: string;
  transaction_type: 'token_spend' | 'custom_spend' | 'generic_spend';
}

export interface UserProfile {
  id: string;
  timezone: string;
  day_rollover_hour: number;
  annual_income?: number;
  calculation_mode?: 'fixed' | 'percentage';
}