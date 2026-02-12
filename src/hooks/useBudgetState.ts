"use client";

import { useCallback, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Module, Category, UserBudgetConfig, Token } from '@/types/budget';
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
const generateTokens = (baseId: string, totalValue: number, preferredDenom: number = 10): Token[] => {
  const tokens: Token[] = [];
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
 */
const mergeBudgetState = (savedModules: Module[], initialModules: Module[]): Module[] => {
  console.log('[useBudgetState] >>> START MERGE');
  
  if (!savedModules || savedModules.length === 0) {
    console.log('[useBudgetState] No saved modules found, using initial defaults.');
    return JSON.parse(JSON.stringify(initialModules));
  }

  const mergedModules: Module[] = JSON.parse(JSON.stringify(savedModules));
  const savedModuleIds = new Set(mergedModules.map(m => m.id));

  for (const initialModule of initialModules) {
    if (!savedModuleIds.has(initialModule.id)) {
      console.log(`[useBudgetState] Adding missing module: ${initialModule.name}`);
      mergedModules.push(JSON.parse(JSON.stringify(initialModule)));
    } else {
      const mergedModule = mergedModules.find(m => m.id === initialModule.id)!;
      const savedCategoryIds = new Set(mergedModule.categories.map(c => c.id));
      
      for (const initialCategory of initialModule.categories) {
        if (!savedCategoryIds.has(initialCategory.id)) {
          console.log(`[useBudgetState] Adding missing category to ${mergedModule.name}: ${initialCategory.name}`);
          mergedModule.categories.push(JSON.parse(JSON.stringify(initialCategory)));
        }
      }
    }
  }

  // DEEP DIAGNOSTIC & SELF-HEALING
  mergedModules.forEach(module => {
    module.categories.forEach(category => {
      const baseTokens = category.tokens.filter(t => !t.id.startsWith('custom-'));
      const customTokens = category.tokens.filter(t => t.id.startsWith('custom-'));
      const sumOfBaseTokens = baseTokens.reduce((sum, t) => sum + t.value, 0);
      
      if (category.id === 'A1') {
        console.log(`[useBudgetState] Groceries (A1) Token Audit:`, {
          baseValue: category.baseValue,
          sumOfBase: sumOfBaseTokens,
          baseTokenCount: baseTokens.length,
          customTokenCount: customTokens.length,
          allTokens: category.tokens.map(t => `${t.id}: $${t.value} (${t.spent ? 'spent' : 'unspent'})`)
        });
      }

      // Self-healing: If base tokens don't match baseValue, regenerate them while preserving spent amount
      if (Math.abs(sumOfBaseTokens - category.baseValue) > 0.01) {
        console.warn(`[useBudgetState] Healing category ${category.name} (${category.id}): Mismatch detected.`);
        
        const totalBaseSpent = baseTokens.filter(t => t.spent).reduce((sum, t) => sum + t.value, 0);
        const freshBaseTokens = generateTokens(category.id, category.baseValue, category.tokenValue || 10);
        
        let currentSpent = 0;
        const healedBaseTokens = freshBaseTokens.map(t => {
          if (currentSpent < totalBaseSpent) {
            currentSpent += t.value;
            return { ...t, spent: true };
          }
          return t;
        });

        category.tokens = [...healedBaseTokens, ...customTokens];
      }
    });
  });

  console.log('[useBudgetState] <<< END MERGE');
  return mergedModules;
};

const fetchBudgetState = async (userId: string): Promise<WeeklyBudgetState> => {
  console.log(`[useBudgetState] Fetching state for user: ${userId}`);
  const { data, error } = await supabase
    .from('weekly_budget_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[useBudgetState] Fetch error:', error);
    throw new Error(error.message);
  }
  
  if (data) {
    console.log('[useBudgetState] Data received from DB:', {
      updated_at: data.updated_at,
      fund: data.gear_travel_fund,
      income: data.annual_income
    });
    const state = data as WeeklyBudgetState;
    state.current_tokens = mergeBudgetState(state.current_tokens, initialModules);
    return state;
  }
  
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
  if (error) throw new Error(error.message);
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
      
      // Log the payload before sending to Supabase
      if (data.current_tokens) {
        const groceries = data.current_tokens.flatMap(m => m.categories).find(c => c.id === 'A1');
        console.log('[useBudgetState] PRE-SAVE Groceries Check:', groceries?.tokens.map(t => `${t.id}: $${t.value}`));
      }

      const payload: any = { user_id: userId, updated_at: new Date().toISOString() };
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
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetState', userId] });
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
    return modules.reduce((total, module) => 
      total + module.categories.reduce((catTotal, category) => {
        if (category.id === FUEL_CATEGORY_ID) return catTotal;
        return catTotal + category.tokens
          .filter(t => t.spent)
          .reduce((tokenTotal, token) => tokenTotal + token.value, 0);
      }, 0)
    , 0);
  }, [modules]);

  const handleTokenSpend = useCallback(async (categoryId: string, tokenId: string) => {
    const category = modules.flatMap(m => m.categories).find(c => c.id === categoryId);
    const token = category?.tokens.find(t => t.id === tokenId);
    if (!token || token.spent) return;

    console.log(`[useBudgetState] Spending token ${tokenId} ($${token.value}) in ${categoryId}`);

    const updatedModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            tokens: cat.tokens.map(t => t.id === tokenId ? { ...t, spent: true } : t)
          };
        }
        return cat;
      })
    }));

    try {
      const { error: txError } = await supabase.from('budget_transactions').insert({
        user_id: userId!,
        amount: token.value,
        category_id: categoryId,
        category_name: category?.name || 'Unknown',
        transaction_type: 'token_spend'
      });
      if (txError) throw txError;
      await saveMutation.mutateAsync({ current_tokens: updatedModules });
      toast.success(`Logged ${formatCurrency(token.value)} for ${category?.name}`);
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    } catch (err: any) {
      toast.error(`Failed to log spend: ${err.message}`);
    }
  }, [modules, userId, saveMutation, queryClient]);

  const handleCustomSpend = useCallback(async (categoryId: string, amount: number) => {
    const category = modules.flatMap(m => m.categories).find(c => c.id === categoryId);
    console.log(`[useBudgetState] Adding custom spend $${amount} to ${categoryId}`);

    const updatedModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(cat => {
        if (cat.id === categoryId) {
          const newToken = { id: `custom-${categoryId}-${Date.now()}`, value: amount, spent: true };
          return { ...cat, tokens: [...cat.tokens, newToken] };
        }
        return cat;
      })
    }));

    try {
      const { error: txError } = await supabase.from('budget_transactions').insert({
        user_id: userId!,
        amount,
        category_id: categoryId,
        category_name: category?.name || 'Unknown',
        transaction_type: 'custom_spend'
      });
      if (txError) throw txError;
      await saveMutation.mutateAsync({ current_tokens: updatedModules });
      toast.success(`Logged custom spend: ${formatCurrency(amount)}`);
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    } catch (err: any) {
      toast.error(`Failed to log custom spend: ${err.message}`);
    }
  }, [modules, userId, saveMutation, queryClient]);

  const handleGenericSpend = useCallback(async (amount: number) => {
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
      toast.error(`Failed to log generic spend: ${err.message}`);
    }
  }, [userId, queryClient]);

  const saveStrategy = useCallback(async (newIncome: number, updatedModules: Module[]) => {
    console.log(`[useBudgetState] Saving strategy with income $${newIncome}`);
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
        
        const roundedBaseValue = Math.round(newBaseValue / 5) * 5;
        
        // CRITICAL: Preserve custom tokens and total spent amount
        const customTokens = category.tokens.filter(t => t.id.startsWith('custom-'));
        const baseSpentAmount = category.tokens
          .filter(t => !t.id.startsWith('custom-') && t.spent)
          .reduce((sum, t) => sum + t.value, 0);
          
        console.log(`[useBudgetState] Category ${category.name} - Preserving $${baseSpentAmount} spent and ${customTokens.length} custom tokens`);

        const freshBaseTokens = generateTokens(category.id, roundedBaseValue, category.tokenValue || 10);
        
        let currentSpent = 0;
        const tokensWithSpent = freshBaseTokens.map(t => {
          if (currentSpent < baseSpentAmount) {
            currentSpent += t.value;
            return { ...t, spent: true };
          }
          return t;
        });

        return {
          ...category,
          baseValue: roundedBaseValue,
          tokens: [...tokensWithSpent, ...customTokens]
        };
      })
    }));

    await saveMutation.mutateAsync({ current_tokens: finalModules, annual_income: newIncome });
    toast.success('Budget strategy saved!');
  }, [saveMutation]);

  const handleMondayReset = useCallback(async () => {
    console.log('[useBudgetState] Performing Monday Reset...');
    const totalBudget = modules.reduce((sum, m) => 
      sum + m.categories.reduce((cs, c) => c.id !== FUEL_CATEGORY_ID ? cs + c.baseValue : cs, 0), 0
    );
    const difference = totalBudget - totalSpentWeekly;
    let newFund = gearTravelFund + (difference > 0 ? difference : 0);

    const resetModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        if (category.id === FUEL_CATEGORY_ID) return category;
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

  const handleFullReset = useCallback(async (amount: number = 0) => {
    console.log('[useBudgetState] Performing FULL Reset...');
    const resetModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => ({
        ...category,
        tokens: category.tokens
          .filter(t => !t.id.startsWith('custom-'))
          .map(t => ({ ...t, spent: false }))
      }))
    }));
    await saveMutation.mutateAsync({ current_tokens: resetModules, gear_travel_fund: amount });
    toast.success('Full reset complete');
  }, [modules, saveMutation]);

  const resetToInitialBudgets = useCallback(async () => {
    console.log('[useBudgetState] Resetting to initial budgets...');
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