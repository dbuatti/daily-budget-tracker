import { Module } from "./budget";

export interface WeeklyBudgetState {
  user_id: string;
  current_tokens: Module[];
  gear_travel_fund: number;
  last_reset_date: string; // ISO date string
  updated_at: string;
}