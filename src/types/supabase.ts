import { Module } from "./budget";

export interface WeeklyBudgetState {
  user_id: string;
  current_tokens: Module[];
  gear_travel_fund: number;
  last_reset_date: string; // ISO date string
  updated_at: string;
}

export interface BudgetTransaction {
  user_id: string;
  amount: number;
  category_id?: string;
  description?: string;
  transaction_type: 'token_spend' | 'custom_spend' | 'generic_spend';
}