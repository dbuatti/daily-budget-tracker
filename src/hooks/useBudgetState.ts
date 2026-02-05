import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Module } from '@/types/budget';
import { WeeklyBudgetState } from '@/types/supabase';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { GENERIC_MODULE_ID, GENERIC_CATEGORY_ID, WEEKLY_BUDGET_TOTAL, initialModules } from '@/data/budgetData';

const fetchBudgetState = async (userId: string): Promise<WeeklyBudgetState> => {
  const { data, error } = await supabase
    .from('weekly_budget_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  if (!data) {
    // Initialize from initialModules
    const modulesWithBaseValues = initialModules.map(module => ({
      ...module,
      categories: module.categories.map(category => ({
        ...category,
        baseValue: category.tokens.reduce((sum, token) => sum + token.value, 0)
      }))
    }));

    const totalTokens = modulesWithBaseValues.reduce((sum, module) => 
      sum + module.categories.reduce((catSum, cat) => catSum + cat.baseValue, 0), 0
    );

    const newState: WeeklyBudgetState = {
      user_id: userId,
      current_tokens: modulesWithBaseValues,
      gear_travel_fund: 0,
      last_reset_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };

    // Insert the new state
    const { error: insertError } = await supabase
      .from('weekly_budget_state')
      .insert(newState);

    if (insertError) {
      throw new Error(insertError.message);
    }

    return newState;
  }

  return data as WeeklyBudgetState;
};

const fetchSpentToday = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .rpc('get_daily_spent_amount', { p_user_id: userId });

  if (error) {
    throw new Error(error.message);
  }

  return data || 0;
};

export const useBudgetState = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [resetBriefing, setResetBriefing] = useState<any>(null);

  const { data: budgetState, isLoading, isError, error } = useQuery({
    queryKey: ['budgetState', user?.id],
    queryFn: () => fetchBudgetState(user!.id),
    enabled: !!user,
  });

  const { data: spentToday, refetch: refetchSpentToday } = useQuery({
    queryKey: ['spentToday', user?.id],
    queryFn: () => fetchSpentToday(user!.id),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const handleTokenSpend = useCallback(async (categoryId: string, tokenId: string) => {
    if (!user || !budgetState) return;

    let tokenToSpend: { value: number; spent: boolean } | null = null;
    let moduleIndex = -1;
    let categoryIndex = -1;

    for (let i = 0; i < budgetState.current_tokens.length; i++) {
      const module = budgetState.current_tokens[i];
      for (let j = 0; j < module.categories.length; j++) {
        const category = module.categories[j];
        if (category.id === categoryId) {
          const token = category.tokens.find(t => t.id === tokenId);
          if (token && !token.spent) {
            tokenToSpend = token;
            moduleIndex = i;
            categoryIndex = j;
            break;
          }
        }
      }
      if (tokenToSpend) break;
    }

    if (!tokenToSpend) {
      toast.error('Token already spent or not found');
      return;
    }

    const { error } = await supabase
      .from('budget_transactions')
      .insert({
        user_id: user.id,
        amount: tokenToSpend.value,
        category_id: categoryId,
        transaction_type: 'token_spend'
      });

    if (error) {
      toast.error('Failed to log spend');
      console.error('Spend error:', error);
      return;
    }

    queryClient.setQueryData(['budgetState', user.id], (old: WeeklyBudgetState | undefined) => {
      if (!old) return old;
      const newModules = [...old.current_tokens];
      const category = newModules[moduleIndex].categories[categoryIndex];
      const newTokens = category.tokens.map(t => 
        t.id === tokenId ? { ...t, spent: true } : t
      );
      newModules[moduleIndex].categories[categoryIndex] = { ...category, tokens: newTokens };
      return { ...old, current_tokens: newModules };
    });

    toast.success(`Spent ${formatCurrency(tokenToSpend.value)}`);
  }, [user, budgetState, queryClient]);

  const handleCustomSpend = useCallback(async (categoryId: string, amount: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('budget_transactions')
      .insert({
        user_id: user.id,
        amount,
        category_id: categoryId,
        transaction_type: 'custom_spend'
      });

    if (error) {
      toast.error('Failed to log custom spend');
      console.error('Custom spend error:', error);
      return;
    }

    toast.success(`Logged custom spend: ${formatCurrency(amount)}`);
    refetchSpentToday();
  }, [user, refetchSpentToday]);

  const handleGenericSpend = useCallback(async (amount: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('budget_transactions')
      .insert({
        user_id: user.id,
        amount,
        transaction_type: 'generic_spend'
      });

    if (error) {
      toast.error('Failed to log generic spend');
      console.error('Generic spend error:', error);
      return;
    }

    toast.success(`Logged generic spend: ${formatCurrency(amount)}`);
    refetchSpentToday();
  }, [user, refetchSpentToday]);

  const handleFundAdjustment = useCallback(async (amount: number) => {
    if (!user || !budgetState) return;

    const { error } = await supabase
      .from('weekly_budget_state')
      .update({ gear_travel_fund: amount })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to adjust fund');
      console.error('Fund adjustment error:', error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['budgetState', user.id] });
    toast.success(`Gear/Travel Fund set to ${formatCurrency(amount)}`);
  }, [user, budgetState, queryClient]);

  const handleFullReset = useCallback(async () => {
    if (!user) return;

    const resetModules = initialModules.map(module => ({
      ...module,
      categories: module.categories.map(category => ({
        ...category,
        tokens: category.tokens.map(token => ({ ...token, spent: false }))
      }))
    }));

    const { error } = await supabase
      .from('weekly_budget_state')
      .update({
        current_tokens: resetModules,
        gear_travel_fund: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to reset budget');
      console.error('Reset error:', error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['budgetState', user.id] });
    queryClient.invalidateQueries({ queryKey: ['spentToday', user.id] });
    toast.success('Budget fully reset');
  }, [user, queryClient]);

  const resetToInitialBudgets = useCallback(async () => {
    if (!user) return;

    const resetModules = initialModules.map(module => ({
      ...module,
      categories: module.categories.map(category => ({
        ...category,
        tokens: category.tokens.map(token => ({ ...token, spent: false }))
      }))
    }));

    const { error } = await supabase
      .from('weekly_budget_state')
      .update({
        current_tokens: resetModules,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to reset tokens');
      console.error('Reset tokens error:', error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['budgetState', user.id] });
    toast.success('All tokens reset to unspent');
  }, [user, queryClient]);

  const handleMondayReset = useCallback(async () => {
    if (!user || !budgetState) return;

    const totalSpent = budgetState.current_tokens.reduce((sum, module) =>
      sum + module.categories.reduce((catSum, category) =>
        catSum + category.tokens.filter(t => t.spent).reduce((tokenSum, token) => tokenSum + token.value, 0)
      , 0), 0);

    const totalBudget = WEEKLY_BUDGET_TOTAL;
    const surplus = Math.max(0, totalBudget - totalSpent);
    const deficit = Math.max(0, totalSpent - totalBudget);

    const newFundTotal = budgetState.gear_travel_fund + surplus;

    const categoryBriefings: any[] = [];

    const resetModules = initialModules.map(module => ({
      ...module,
      categories: module.categories.map(category => ({
        ...category,
        tokens: category.tokens.map(token => ({ ...token, spent: false }))
      }))
    }));

    const { error } = await supabase
      .from('weekly_budget_state')
      .update({
        current_tokens: resetModules,
        gear_travel_fund: newFundTotal,
        last_reset_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to complete Monday reset');
      console.error('Monday reset error:', error);
      return;
    }

    setResetBriefing({
      totalSpent,
      totalBudget: totalBudget,
      totalSurplus: surplus,
      totalDeficit: deficit,
      newGearTravelFund: newFundTotal,
      categoryBriefings
    });

    queryClient.invalidateQueries({ queryKey: ['budgetState', user.id] });
    queryClient.invalidateQueries({ queryKey: ['spentToday', user.id] });
  }, [user, budgetState, queryClient]);

  const clearBriefing = useCallback(() => {
    setResetBriefing(null);
  }, []);

  const modules = budgetState?.current_tokens || initialModules;
  const gearTravelFund = budgetState?.gear_travel_fund || 0;
  const totalSpent = budgetState ? budgetState.current_tokens.reduce((sum, module) =>
    sum + module.categories.reduce((catSum, category) =>
      catSum + category.tokens.filter(t => t.spent).reduce((tokenSum, token) => tokenSum + token.value, 0)
    , 0), 0) : 0;

  return {
    modules,
    gearTravelFund,
    totalSpent,
    isLoading,
    isError,
    error,
    handleTokenSpend,
    handleMondayReset,
    resetBriefing,
    clearBriefing,
    spentToday: spentToday || 0,
    refetchSpentToday,
    handleCustomSpend,
    handleGenericSpend,
    handleFundAdjustment,
    handleFullReset,
    resetToInitialBudgets
  };
};