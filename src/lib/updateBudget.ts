import { supabase } from '@/integrations/supabase/client';
import { Module } from '@/types/budget';

export async function updateUserBudgetByEmail(
  email: string,
  modules: Module[],
  gearTravelFund: number,
) {
  // Get user ID
  const { data: userData, error: userError } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', email)
    .single();

  if (userError) {
    throw new Error(`User not found: ${userError.message}`);
  }

  const userId = userData.id;

  // Upsert weekly_budget_state
  const { error } = await supabase
    .from('weekly_budget_state')
    .upsert({
      user_id: userId,
      current_tokens: modules,
      gear_travel_fund: gearTravelFund,
      last_reset_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to update budget: ${error.message}`);
  }
}