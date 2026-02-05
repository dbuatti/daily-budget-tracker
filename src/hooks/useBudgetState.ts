import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Module } from '@/types/budget';
import { WeeklyBudgetState } from '@/types/supabase';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { GENERIC_MODULE_ID, WEEKLY_BUDGET_TOTAL } from '@/data/budgetData';

// Helper functions defined outside the hook
const fetchBudgetState = async (userId: string): Promise<WeeklyBudgetState> => {
  const { data, error } = await supabase
    .from('weekly_budget_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  
  if (data) {
    return data as WeeklyBudgetState;
  }
  
  return {
    user_id: userId,
    current_tokens: [],
    gear_travel_fund: 0,
    last_reset_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  };
};

const fetchSpentToday = async (userId: string): Promise<number> => {
  const { data, error } = await supabase.rpc('get_daily_spent_amount', { p_user_id: userId });
  
  if (error) {
    console.error('RPC Error:', error);
    throw new Error(error.message);
  }
  
  return data || 0;
};

const logTransaction = async (userId: string, amount: number, categoryId?: string, transactionType: 'token_spend' | 'custom_spend' | 'generic_spend' = 'token_spend') => {
  const { error } = await supabase
    .from('budget_transactions')
    .insert({
      user_id: userId,
      amount,
      category_id: categoryId,
      transaction_type: transactionType
    });

  if (error) {
    console.error('Transaction log error:', error);
    throw new Error(error.message);
  }
};

const saveBudgetState = async (userId: string, modules: Module[], gearTravelFund: number) => {
  const { error } = await supabase
    .from('weekly_budget_state')
    .upsert({
      user_id: userId,
      current_tokens: modules,
      gear_travel_fund: gearTravelFund,
      last_reset_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Save state error:', error);
    throw new Error(error.message);
  }
};

export const useBudgetState = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // State for Monday Briefing dialog
  const [briefingData, setBriefingData] = useState<{
    totalSpent: number;
    totalBudget: number;
    totalSurplus: number;
    totalDeficit: number;
    newGearTravelFund: number;
    categoryBriefings: Array<{ categoryName: string; difference: number; newBaseValue?: number }>;
  } | null>(null);

  const { data: state, isLoading, isError } = useQuery({
    queryKey: ['budgetState', userId],
    queryFn: () => fetchBudgetState(userId!),
    enabled: !!userId,
  });

  const { data: spentToday, refetch: refetchSpentToday } = useQuery({
    queryKey: ['spentToday', userId],
    queryFn: () => fetchSpentToday(userId!),
    enabled: !!userId,
  });

  const logTransactionMutation = useMutation({
    mutationFn: ({ amount, categoryId, transactionType }: { amount: number; categoryId?: string; transactionType: 'token_spend' | 'custom_spend' | 'generic_spend' }) => 
      logTransaction(userId!, amount, categoryId, transactionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: { modules: Module[]; gearTravelFund: number }) => 
      saveBudgetState(userId!, data.modules, data.gearTravelFund),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetState', userId] });
    },
  });

  const modules: Module[] = state?.current_tokens || [];
  const gearTravelFund = state?.gear_travel_fund || 0;

  const totalSpentWeekly = modules.reduce((total, module) => 
    total + module.categories.reduce((catTotal, category) => 
      catTotal + category.tokens.filter(t => t.spent).reduce((tokenTotal, token) => tokenTotal + token.value, 0)
    , 0)
  , 0);

  const handleTokenSpend = useCallback(async (categoryId: string, tokenId: string) => {
    console.log('[useBudgetState] handleTokenSpend CALLED with:', { categoryId, tokenId });
    
    try {
      let categoryFound = false;
      let tokenFound = false;
      let amount = 0;

      console.log('[useBudgetState] Current modules structure:', JSON.stringify(modules, null, 2));

      const updatedModules = modules.map(module => ({
        ...module,
        categories: module.categories.map(category => {
          if (category.id === categoryId) {
            categoryFound = true;
            console.log('[useBudgetState] Found category:', category.name);
            const updatedTokens = category.tokens.map(token => {
              if (token.id === tokenId) {
                tokenFound = true;
                amount = token.value;
                console.log('[useBudgetState] Found token, value:', token.value, 'spent:', token.spent);
                return { ...token, spent: true };
              }
              return token;
            });
            return { ...category, tokens: updatedTokens };
          }
          return category;
        })
      }));

      if (!categoryFound || !tokenFound) {
        console.error('[useBudgetState] Category or token not found!', { categoryFound, tokenFound, categoryId, tokenId });
        throw new Error('Category or token not found');
      }

      console.log('[useBudgetState] About to log transaction with amount:', amount);
      
      console.log('[useBudgetState] Calling logTransactionMutation.mutateAsync...');
      await logTransactionMutation.mutateAsync({ amount, categoryId, transactionType: 'token_spend' });
      console.log('[useBudgetState] Transaction logged successfully');

      console.log('[useBudgetState] About to save state with updated modules');
      
      await saveMutation.mutateAsync({ modules: updatedModules, gearTravelFund });

      console.log('[useBudgetState] State saved successfully');
      toast.success(`Logged ${formatCurrency(amount)}`);
    } catch (error) {
      console.error('[useBudgetState] Error in handleTokenSpend:', error);
      toast.error('Failed to log transaction');
    }
  }, [modules, gearTravelFund, logTransactionMutation, saveMutation]);

  const handleCustomSpend = useCallback(async (categoryId: string, amount: number) => {
    try {
      const updatedModules = modules.map(module => ({
        ...module,
        categories: module.categories.map(category => {
          if (category.id === categoryId) {
            const customTokenId = `custom-${categoryId}-${Date.now()}-${Math.random()}`;
            const newToken = { id: customTokenId, value: amount, spent: true };
            return { 
              ...category, 
              tokens: [...category.tokens, newToken] 
            };
          }
          return category;
        })
      }));

      await logTransactionMutation.mutateAsync({ amount, categoryId, transactionType: 'custom_spend' });
      await saveMutation.mutateAsync({ modules: updatedModules, gearTravelFund });
      toast.success(`Logged custom spend: ${formatCurrency(amount)}`);
    } catch (error) {
      console.error('Error in handleCustomSpend:', error);
      toast.error('Failed to log custom spend');
    }
  }, [modules, gearTravelFund, logTransactionMutation, saveMutation]);

  const handleGenericSpend = useCallback(async (amount: number) => {
    try {
      await logTransactionMutation.mutateAsync({ amount, transactionType: 'generic_spend' });
      toast.success(`Logged generic spend: ${formatCurrency(amount)}`);
    } catch (error) {
      console.error('Error in handleGenericSpend:', error);
      toast.error('Failed to log generic spend');
    }
  }, [logTransactionMutation]);

  const handleFundAdjustment = useCallback(async (newFund: number) => {
    try {
      await saveMutation.mutateAsync({ modules, gearTravelFund: newFund });
      toast.success(`Gear/Travel Fund updated to ${formatCurrency(newFund)}`);
    } catch (error) {
      console.error('Error in handleFundAdjustment:', error);
      toast.error('Failed to update fund');
    }
  }, [modules, gearTravelFund, saveMutation]);

  const handleMondayReset = useCallback(async () => {
    try {
      const totalSpent = totalSpentWeekly;
      const totalBudget = WEEKLY_BUDGET_TOTAL;
      const difference = totalBudget - totalSpent;
      
      let newFund = gearTravelFund;
      let categoryBriefings: Array<{ categoryName: string; difference: number; newBaseValue?: number }> = [];

      if (difference > 0) {
        newFund += difference;
      } else {
        const deficit = Math.abs(difference);
        const totalBaseValue = modules.reduce((sum, module) => 
          sum + module.categories.reduce((catSum, cat) => catSum + cat.baseValue, 0)
        , 0);
        
        const deficitRatio = deficit / totalBaseValue;
        
        const adjustedModules = modules.map(module => ({
          ...module,
          categories: module.categories.map(category => {
            const adjustment = Math.round(category.baseValue * deficitRatio * 100) / 100;
            const newBaseValue = category.baseValue - adjustment;
            categoryBriefings.push({
              categoryName: category.name,
              difference: -adjustment,
              newBaseValue: newBaseValue
            });
            return {
              ...category,
              baseValue: newBaseValue,
              tokens: category.tokens.map(token => ({ ...token, spent: false }))
            };
          })
        }));

        await saveMutation.mutateAsync({ modules: adjustedModules, gearTravelFund });
      }

      const resetModules = modules.map(module => ({
        ...module,
        categories: module.categories.map(category => ({
          ...category,
          tokens: category.tokens.map(token => ({ ...token, spent: false }))
        }))
      }));

      await saveMutation.mutateAsync({ modules: resetModules, gearTravelFund: newFund });

      toast.success('Weekly reset complete!');
      queryClient.invalidateQueries({ queryKey: ['budgetState', userId] });
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });

      setBriefingData({
        totalSpent,
        totalBudget,
        totalSurplus: difference > 0 ? difference : 0,
        totalDeficit: difference < 0 ? Math.abs(difference) : 0,
        newGearTravelFund: newFund,
        categoryBriefings: categoryBriefings.filter(item => item.difference !== 0)
      });
    } catch (error) {
      console.error('Error in handleMondayReset:', error);
      toast.error('Failed to reset weekly budget');
      throw error;
    }
  }, [modules, gearTravelFund, totalSpentWeekly, saveMutation, queryClient, userId]);

  const handleFullReset = useCallback(async () => {
    try {
      await saveMutation.mutateAsync({ modules: [], gearTravelFund: 0 });
      toast.success('Full budget reset complete');
      queryClient.invalidateQueries({ queryKey: ['budgetState', userId] });
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    } catch (error) {
      console.error('Error in handleFullReset:', error);
      toast.error('Failed to reset budget');
    }
  }, [saveMutation, queryClient, userId]);

  const clearBriefing = useCallback(() => {
    setBriefingData(null);
  }, []);

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
    resetBriefing: briefingData,
    clearBriefing,
  };
};