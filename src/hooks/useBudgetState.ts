"use client";

import { useCallback, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Module, Category, UserBudgetConfig } from '@/types/budget';
import { WeeklyBudgetState } from '@/types/supabase';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { 
  GENERIC_MODULE_ID, 
  initialModules, 
  FUEL_CATEGORY_ID, 
  DEFAULT_ANNUAL_INCOME, 
  WEEKS_IN_YEAR 
} from '@/data/budgetData';

/**
 * Helper to generate tokens based on value and denomination.
 */
const generateTokens = (baseId: string, totalValue: number, preferredDenom: number = 10) => {
  const tokens = [];
  let remaining = totalValue;
  let count = 0;
  while (remaining >= preferredDenom) {
    tokens.push({ id: `${baseId}-${count++}`, value: preferredDenom, spent: false });
    remaining -= preferredDenom;
  }
  if (remaining >= 0.01) {
    tokens.push({ id: `${baseId}-${count++}`, value: Math.round(remaining * 100) / 100, spent: false });
  }
  return tokens;
};

/**
 * Merges the saved state from the database with the initial hardcoded modules.
 * This ensures that if we add new categories in code, they appear for the user,
 * but their existing customizations and spent statuses are preserved.
 */
const mergeBudgetState = (savedModules: Module[], initialModules: Module[]): Module[] => {
  console.log('[useBudgetState] Merging saved modules with initial modules...');
  
  // If no saved modules, just use initial
  if (!savedModules || savedModules.length === 0) {
    console.log('[useBudgetState] No saved modules found, using initial defaults.');
    return JSON.parse(JSON.stringify(initialModules));
  }

  // We want to keep the user's saved modules as the primary source of truth,
  // but append any NEW modules or categories from initialModules that don't exist in saved.
  const mergedModules: Module[] = JSON.parse(JSON.stringify(savedModules));
  const savedModuleIds = new Set(mergedModules.map(m => m.id));

  // Add missing modules from initial
  for (const initialModule of initialModules) {
    if (!savedModuleIds.has(initialModule.id)) {
      console.log(`[useBudgetState] Adding missing module from defaults: ${initialModule.name} (${initialModule.id})`);
      mergedModules.push(JSON.parse(JSON.stringify(initialModule)));
    } else {
      // Module exists, check for missing categories within it
      const mergedModule = mergedModules.find(m => m.id === initialModule.id)!;
      const savedCategoryIds = new Set(mergedModule.categories.map(c => c.id));
      
      for (const initialCategory of initialModule.categories) {
        if (!savedCategoryIds.has(initialCategory.id)) {
          console.log(`[useBudgetState] Adding missing category to module ${mergedModule.name}: ${initialCategory.name}`);
          mergedModule.categories.push(JSON.parse(JSON.stringify(initialCategory)));
        }
      }
    }
  }

  return mergedModules;
};

const fetchBudgetState = async (userId: string): Promise<WeeklyBudgetState> => {
  console.log(`[useBudgetState] Fetching budget state for user: ${userId}`);
  const { data, error } = await supabase
    .from('weekly_budget_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[useBudgetState] Error fetching budget state:', error);
    throw new Error(error.message);
  }
  
  if (data) {
    console.log('[useBudgetState] Budget state found in database.');
    const state = data as WeeklyBudgetState;
    state.current_tokens = mergeBudgetState(state.current_tokens, initialModules);
    return state;
  }
  
  console.log('[useBudgetState] No budget state found, initializing with defaults.');
  return {
    user_id: userId,
    current_tokens: JSON.parse(JSON.stringify(initialModules)),
    gear_travel_fund: 0,
    annual_income: DEFAULT_ANNUAL_INCOME,
    last_reset_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
    config: { annualIncome: DEFAULT_ANNUAL_INCOME, calculationMode: 'percentage', payFrequency: 'weekly' }
  };
};

const fetchSpentToday = async (userId: string): Promise<number> => {
  const { data, error } = await supabase.rpc('get_daily_spent_amount', { p_user_id: userId });
  if (error) {
    console.error('[useBudgetState] Error fetching daily spent amount:', error);
    throw new Error(error.message);
  }
  return data || 0;
};

export const useBudgetState = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const [briefingData, setBriefingData] = useState<any>(null);

  const { data: state, isLoading, isError } = useQuery({
    queryKey: ['budgetState', userId],
    queryFn: () => fetchBudgetState(userId!),
    enabled: !!userId,
  });

  const { data: spentTodayData, refetch: refetchSpentToday } = useQuery({
    queryKey: ['spentToday', userId],
    queryFn: () => fetchSpentToday(userId!),
    enabled: !!userId,
  });
  
  const spentToday = spentTodayData || 0;

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<WeeklyBudgetState>) => {
      if (!userId) return;
      
      console.log('[useBudgetState] Saving budget state update...', data);
      
      const payload: any = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };

      if (data.current_tokens) payload.current_tokens = data.current_tokens;
      if (data.gear_travel_fund !== undefined) payload.gear_travel_fund = data.gear_travel_fund;
      if (data.annual_income !== undefined) payload.annual_income = data.annual_income;
      
      const { data: result, error } = await supabase
        .from('weekly_budget_state')
        .upsert(payload, { onConflict: 'user_id' })
        .select();

      if (error) {
        console.error('[useBudgetState] Upsert error:', error);
        throw error;
      }
      
      console.log('[useBudgetState] Save successful.');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetState', userId] });
    },
    onError: (error: any) => {
      console.error('[useBudgetState] Mutation error:', error);
      toast.error(`Failed to save: ${error.message}`);
    }
  });

  const modules: Module[] = state?.current_tokens || [];
  const gearTravelFund = state?.gear_travel_fund || 0;
  const annualIncome = state?.annual_income || state?.config?.annualIncome || DEFAULT_ANNUAL_INCOME;
  
  const config: UserBudgetConfig = useMemo(() => ({
    annualIncome,
    calculationMode: state?.config?.calculationMode || 'percentage',
    payFrequency: state?.config?.payFrequency || 'weekly'
  }), [state, annualIncome]);

  const totalSpentWeekly = useMemo(() => {
    const total = modules.reduce((total, module) => 
      total + module.categories.reduce((catTotal, category) => {
        // Fuel is excluded from weekly total as it's a 4-week budget
        if (category.id === FUEL_CATEGORY_ID) return catTotal;
        return catTotal + category.tokens
          .filter(t => t.spent)
          .reduce((tokenTotal, token) => tokenTotal + token.value, 0);
      }, 0)
    , 0);
    console.log(`[useBudgetState] Calculated total weekly spent: ${total}`);
    return total;
  }, [modules]);

  const handleTokenSpend = useCallback(async (categoryId: string, tokenId: string) => {
    const category = modules.flatMap(m => m.categories).find(c => c.id === categoryId);
    const token = category?.tokens.find(t => t.id === tokenId);
    
    if (!token || token.spent) return;

    const amount = token.value;
    const categoryName = category?.name || 'Unknown Category';

    console.log(`[useBudgetState] Logging token spend: ${amount} in ${categoryName}`);

    const updatedModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            tokens: category.tokens.map(t => t.id === tokenId ? { ...t, spent: true } : t)
          };
        }
        return category;
      })
    }));

    try {
      const { error: txError } = await supabase.from('budget_transactions').insert({
        user_id: userId!,
        amount,
        category_id: categoryId,
        category_name: categoryName,
        transaction_type: 'token_spend'
      });

      if (txError) throw txError;

      await saveMutation.mutateAsync({ current_tokens: updatedModules });
      toast.success(`Logged ${formatCurrency(amount)} for ${categoryName}`);
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    } catch (err: any) {
      console.error('[useBudgetState] Token spend failed:', err);
      toast.error(`Failed to log spend: ${err.message}`);
    }
  }, [modules, userId, saveMutation, queryClient]);

  const handleCustomSpend = useCallback(async (categoryId: string, amount: number) => {
    const category = modules.flatMap(m => m.categories).find(c => c.id === categoryId);
    const categoryName = category?.name || 'Unknown Category';

    console.log(`[useBudgetState] Logging custom spend: ${amount} in ${categoryName}`);

    const updatedModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        if (category.id === categoryId) {
          const newToken = { 
            id: `custom-${categoryId}-${Date.now()}`, 
            value: amount, 
            spent: true 
          };
          return { ...category, tokens: [...category.tokens, newToken] };
        }
        return category;
      })
    }));

    try {
      const { error: txError } = await supabase.from('budget_transactions').insert({
        user_id: userId!,
        amount,
        category_id: categoryId,
        category_name: categoryName,
        transaction_type: 'custom_spend'
      });

      if (txError) throw txError;

      await saveMutation.mutateAsync({ current_tokens: updatedModules });
      toast.success(`Logged custom spend: ${formatCurrency(amount)} in ${categoryName}`);
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    } catch (err: any) {
      console.error('[useBudgetState] Custom spend failed:', err);
      toast.error(`Failed to log custom spend: ${err.message}`);
    }
  }, [modules, userId, saveMutation, queryClient]);

  const handleGenericSpend = useCallback(async (amount: number) => {
    console.log(`[useBudgetState] Logging generic spend: ${amount}`);
    try {
      const { error: txError } = await supabase.from('budget_transactions').insert({
        user_id: userId!,
        amount,
        category_name: 'Generic Spend',
        transaction_type: 'generic_spend'
      });

      if (txError) throw txError;

      toast.success(`Logged generic spend: ${formatCurrency(amount)}`);
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    } catch (err: any) {
      console.error('[useBudgetState] Generic spend failed:', err);
      toast.error(`Failed to log generic spend: ${err.message}`);
    }
  }, [userId, queryClient]);

  const saveStrategy = useCallback(async (newIncome: number, updatedModules: Module[]) => {
    console.log(`[useBudgetState] Saving new budget strategy. Income: ${newIncome}`);
    const weeklyIncome = newIncome / WEEKS_IN_YEAR;
    
    const finalModules = updatedModules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        let newBaseValue = category.baseValue;
        
        if (category.frequency === 'monthly') {
          newBaseValue = (category.totalMonthlyAmount || 0) / 4;
        } else if (category.mode === 'percentage') {
          newBaseValue = Math.round((weeklyIncome * (category.percentage || 0) / 100) * 100) / 100;
        }
        
        // Round to nearest $5 for token generation
        const roundedBaseValue = Math.round(newBaseValue / 5) * 5;
        
        // Preserve spent status if possible by mapping old spent tokens to new ones
        const spentAmount = category.tokens
          .filter(t => t.spent)
          .reduce((sum, t) => sum + t.value, 0);
          
        const freshTokens = generateTokens(category.id, roundedBaseValue, category.tokenValue || 10);
        
        let currentSpent = 0;
        const tokensWithSpent = freshTokens.map(t => {
          if (currentSpent < spentAmount) {
            currentSpent += t.value;
            return { ...t, spent: true };
          }
          return t;
        });

        return {
          ...category,
          baseValue: roundedBaseValue,
          tokens: tokensWithSpent
        };
      })
    }));

    await saveMutation.mutateAsync({ 
      current_tokens: finalModules, 
      annual_income: newIncome 
    });
    toast.success('Budget strategy saved!');
  }, [saveMutation]);

  const handleMondayReset = useCallback(async () => {
    console.log('[useBudgetState] Performing weekly reset...');
    const totalBudget = modules.reduce((sum, m) => 
      sum + m.categories.reduce((cs, c) => c.id !== FUEL_CATEGORY_ID ? cs + c.baseValue : cs, 0), 0
    );
    const difference = totalBudget - totalSpentWeekly;
    let newFund = gearTravelFund + (difference > 0 ? difference : 0);

    console.log(`[useBudgetState] Reset stats: Budget=${totalBudget}, Spent=${totalSpentWeekly}, Surplus=${difference}`);

    const resetModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        // Fuel doesn't reset weekly
        if (category.id === FUEL_CATEGORY_ID) return category;
        
        // Remove custom tokens and reset spent status on base tokens
        const baseTokens = category.tokens
          .filter(t => !t.id.startsWith('custom-'))
          .map(t => ({ ...t, spent: false }));
          
        return { ...category, tokens: baseTokens };
      })
    }));

    await saveMutation.mutateAsync({ 
      current_tokens: resetModules, 
      gear_travel_fund: newFund,
      last_reset_date: new Date().toISOString().split('T')[0]
    });
    
    toast.success('Weekly reset complete!');
    setBriefingData({ 
      totalSpent: totalSpentWeekly, 
      totalBudget, 
      totalSurplus: Math.max(0, difference), 
      newGearTravelFund: newFund, 
      categoryBriefings: [] 
    });
  }, [modules, totalSpentWeekly, gearTravelFund, saveMutation]);

  const handleFundAdjustment = useCallback(async (amount: number) => {
    await saveMutation.mutateAsync({ gear_travel_fund: amount });
  }, [saveMutation]);

  const handleFullReset = useCallback(async () => {
    console.log('[useBudgetState] Performing FULL reset...');
    const resetModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => ({
        ...category,
        tokens: category.tokens
          .filter(t => !t.id.startsWith('custom-'))
          .map(t => ({ ...t, spent: false }))
      }))
    }));
    await saveMutation.mutateAsync({ current_tokens: resetModules, gear_travel_fund: 0 });
    toast.success('Full reset complete');
  }, [modules, saveMutation]);

  const resetToInitialBudgets = useCallback(async () => {
    console.log('[useBudgetState] Restoring initial budgets...');
    await saveMutation.mutateAsync({ current_tokens: JSON.parse(JSON.stringify(initialModules)) });
    toast.success('Restored initial budgets');
  }, [saveMutation]);

  return {
    modules,
    gearTravelFund,
    totalSpent: totalSpentWeekly,
    spentToday,
    config,
    isLoading,
    isError,
    isSaving: saveMutation.isPending,
    handleTokenSpend,
    handleCustomSpend,
    handleGenericSpend,
    saveStrategy,
    handleMondayReset,
    handleFundAdjustment,
    handleFullReset,
    resetToInitialBudgets,
    refetchSpentToday,
    resetBriefing: briefingData,
    clearBriefing: () => setBriefingData(null),
  };
};