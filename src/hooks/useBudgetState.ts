"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Module } from '@/types/budget';
import { formatCurrency } from '@/lib/format';
import { WEEKLY_BUDGET_TOTAL, initialModules } from '@/data/budgetData';
import { toast } from 'sonner';
import { format as formatDate } from 'date-fns';
import { useUserProfile } from './useUserProfile';

// Types
interface WeeklyBudgetState {
  user_id: string;
  current_tokens: Module[];
  gear_travel_fund: number;
  last_reset_date: string;
  updated_at: string;
}

interface BriefingData {
  totalSpent: number;
  totalBudget: number;
  totalSurplus: number;
  totalDeficit: number;
  newGearTravelFund: number;
  categoryBriefings: Array<{
    categoryName: string;
    difference: number;
    newBaseValue?: number;
  }>;
}

// Helper functions
const calculateTotalSpent = (modules: Module[]): number => {
  return modules.reduce((total, module) => 
    total + module.categories.reduce((catTotal, category) => 
      catTotal + category.tokens.filter(t => t.spent).reduce((sum, token) => sum + token.value, 0)
    , 0)
  , 0);
};

const getTodayDateKey = () => {
  const { profile } = useUserProfile();
  const now = new Date();
  // This is simplified - in production you'd use the user's timezone and rollover hour
  return formatDate(now, 'yyyy-MM-dd');
};

// Main hook
export const useBudgetState = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();
  
  // Fetch weekly budget state
  const { data: state, isLoading, isError, refetch } = useQuery<WeeklyBudgetState>({
    queryKey: ['weeklyBudgetState', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('weekly_budget_state')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data as WeeklyBudgetState;
    },
    enabled: !!user,
  });

  // Fetch today's spent amount from RPC
  const { data: spentToday = 0, refetch: refetchSpentToday } = useQuery({
    queryKey: ['spentToday', user?.id, profile?.timezone],
    queryFn: async () => {
      if (!user) return 0;
      
      // Call the RPC function that respects timezone and rollover
      const { data, error } = await supabase.rpc('get_daily_spent_amount', {
        p_user_id: user.id,
        p_timezone: profile?.timezone || 'UTC'
      });
      
      if (error) {
        console.error('Error fetching daily spent:', error);
        return 0;
      }
      
      return data || 0;
    },
    enabled: !!user && !!profile,
  });

  // Memoized derived values
  const modules = useMemo(() => {
    if (!state?.current_tokens) return [];
    return state.current_tokens;
  }, [state?.current_tokens]);

  const totalSpentWeekly = useMemo(() => {
    return calculateTotalSpent(modules);
  }, [modules]);

  const gearTravelFund = useMemo(() => {
    return state?.gear_travel_fund || 0;
  }, [state?.gear_travel_fund]);

  // Actions
  const handleTokenSpend = useCallback(async (categoryId: string, tokenId: string) => {
    if (!user || !state) return;

    try {
      // Find and mark token as spent
      const newModules = modules.map(module => ({
        ...module,
        categories: module.categories.map(category => 
          category.id === categoryId
            ? {
                ...category,
                tokens: category.tokens.map(token =>
                  token.id === tokenId ? { ...token, spent: true } : token
                )
              }
            : category
        )
      }));

      // Update state in DB
      const { error } = await supabase
        .from('weekly_budget_state')
        .update({ current_tokens: newModules })
        .eq('user_id', user.id);

      if (error) throw error;

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['weeklyBudgetState'] });
      await refetchSpentToday();
      
      toast.success('Transaction logged successfully');
    } catch (error) {
      console.error('Error spending token:', error);
      toast.error('Failed to log transaction');
    }
  }, [user, state, modules, queryClient, refetchSpentToday]);

  const handleCustomSpend = useCallback(async (categoryId: string, amount: number) => {
    if (!user || !state) return;

    try {
      // Record custom spend in transactions table
      const { error: transactionError } = await supabase
        .from('budget_transactions')
        .insert({
          user_id: user.id,
          amount,
          category_id: categoryId,
          transaction_type: 'custom_spend',
        });

      if (transactionError) throw transactionError;

      // Update the category's base value (increase it by the custom spend amount)
      const newModules = modules.map(module => ({
        ...module,
        categories: module.categories.map(category => 
          category.id === categoryId
            ? {
                ...category,
                baseValue: category.baseValue + amount,
                tokens: [...category.tokens, { id: `custom-${Date.now()}`, value: amount, spent: true }]
              }
            : category
        )
      }));

      const { error: stateError } = await supabase
        .from('weekly_budget_state')
        .update({ current_tokens: newModules })
        .eq('user_id', user.id);

      if (stateError) throw stateError;

      await queryClient.invalidateQueries({ queryKey: ['weeklyBudgetState'] });
      await refetchSpentToday();
      
      toast.success('Custom spend logged');
    } catch (error) {
      console.error('Error adding custom spend:', error);
      toast.error('Failed to log custom spend');
    }
  }, [user, state, modules, queryClient, refetchSpentToday]);

  const handleGenericSpend = useCallback(async (amount: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('budget_transactions')
        .insert({
          user_id: user.id,
          amount,
          transaction_type: 'generic_spend',
        });

      if (error) throw error;
      await refetchSpentToday();
      toast.success('Generic spend logged');
    } catch (error) {
      console.error('Error logging generic spend:', error);
      toast.error('Failed to log spend');
    }
  }, [user, refetchSpentToday]);

  const handleFundAdjustment = useCallback(async (newFund: number) => {
    if (!user || !state) return;

    try {
      const { error } = await supabase
        .from('weekly_budget_state')
        .update({ gear_travel_fund: newFund })
        .eq('user_id', user.id);

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['weeklyBudgetState'] });
      toast.success('Fund updated');
    } catch (error) {
      console.error('Error adjusting fund:', error);
      toast.error('Failed to update fund');
    }
  }, [user, state, queryClient]);

  const calculateMondayReset = useCallback((): BriefingData => {
    if (!state) {
      return {
        totalSpent: 0,
        totalBudget: WEEKLY_BUDGET_TOTAL,
        totalSurplus: 0,
        totalDeficit: 0,
        newGearTravelFund: 0,
        categoryBriefings: [],
      };
    }

    const totalSpentWeekly = calculateTotalSpent(modules);
    const totalBudget = WEEKLY_BUDGET_TOTAL;
    const overallDifference = totalBudget - totalSpentWeekly;
    
    let totalSurplus = 0;
    let totalDeficit = 0;
    const categoryBriefings: BriefingData['categoryBriefings'] = [];

    // Calculate category adjustments
    modules.forEach(module => {
      module.categories.forEach(category => {
        const initialBudget = category.baseValue;
        const totalSpentInCategory = category.tokens
          .filter(t => t.spent)
          .reduce((sum, token) => sum + token.value, 0);
        const difference = initialBudget - totalSpentInCategory;

        if (difference < 0) {
          // Deficit: category went over
          totalDeficit += Math.abs(difference);
          categoryBriefings.push({
            categoryName: category.name,
            difference: -Math.abs(difference),
            newBaseValue: initialBudget + Math.abs(difference),
          });
        } else if (difference > 0) {
          // Surplus: category saved money
          totalSurplus += difference;
        }
      });
    });

    // Calculate new fund
    const newGearTravelFund = gearTravelFund + totalSurplus - totalDeficit;

    return {
      totalSpent: totalSpentWeekly,
      totalBudget,
      totalSurplus,
      totalDeficit,
      newGearTravelFund,
      categoryBriefings,
    };
  }, [state, modules, gearTravelFund]);

  const handleMondayReset = useCallback(async () => {
    if (!user) return;

    try {
      const briefingData = calculateMondayReset();
      
      // Reset all tokens to unspent and keep the base values
      const resetModules = initialModules.map(module => ({
        ...module,
        categories: module.categories.map(category => ({
          ...category,
          tokens: category.tokens.map(token => ({ ...token, spent: false })),
        }))
      }));

      // Update state with reset tokens and new fund
      const { error } = await supabase
        .from('weekly_budget_state')
        .upsert({
          user_id: user.id,
          current_tokens: resetModules,
          gear_travel_fund: briefingData.newGearTravelFund,
          last_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['weeklyBudgetState'] });
      await refetchSpentToday();
      
      toast.success('Week reset complete!');
    } catch (error) {
      console.error('Error resetting budget:', error);
      toast.error('Failed to reset budget');
    }
  }, [user, queryClient, refetchSpentToday, calculateMondayReset]);

  const handleFullReset = useCallback(async () => {
    if (!user) return;
    
    if (!confirm('Are you sure? This will wipe all data and reset to initial state.')) return;

    try {
      // Delete existing record
      await supabase
        .from('weekly_budget_state')
        .delete()
        .eq('user_id', user.id);

      // Create fresh record with initial modules
      const { error } = await supabase
        .from('weekly_budget_state')
        .insert({
          user_id: user.id,
          current_tokens: initialModules,
          gear_travel_fund: 0,
          last_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['weeklyBudgetState'] });
      await refetchSpentToday();
      
      toast.success('Full reset complete!');
    } catch (error) {
      console.error('Error doing full reset:', error);
      toast.error('Failed to reset');
    }
  }, [user, queryClient, refetchSpentToday]);

  const clearBriefing = useCallback(() => {
    // This would clear any briefing data from localStorage/session
    sessionStorage.removeItem('mondayBriefing');
  }, []);

  const resetBriefing = useMemo<BriefingData | null>(() => {
    // Check if we should show Monday briefing
    const lastReset = state?.last_reset_date;
    const today = getTodayDateKey();
    
    if (lastReset !== today) {
      return calculateMondayReset();
    }
    
    // Check session storage for manual trigger
    const sessionBriefing = sessionStorage.getItem('mondayBriefing');
    if (sessionBriefing) {
      try {
        return JSON.parse(sessionBriefing);
      } catch {
        return null;
      }
    }
    
    return null;
  }, [state?.last_reset_date, calculateMondayReset]);

  return {
    modules,
    gearTravelFund,
    totalSpent: totalSpentWeekly,
    spentToday: spentToday || 0,
    isLoading,
    isError,
    handleTokenSpend,
    handleCustomSpend,
    handleGenericSpend,
    handleFundAdjustment,
    handleMondayReset,
    handleFullReset,
    refetchSpentToday,
    resetBriefing,
    clearBriefing,
    state,
  };
};