"use client";

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Module, Category, Token } from '@/types/budget';
import { WeeklyBudgetState, BudgetTransaction } from '@/types/supabase';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { startOfWeek, format, isAfter, parseISO, startOfDay } from 'date-fns';
import { 
  GENERIC_CATEGORY_ID,
  initialModules, 
  FUEL_CATEGORY_ID, 
  DEFAULT_ANNUAL_INCOME 
} from '@/data/budgetData';

const generateTokens = (baseId: string, totalValue: number, preferredDenom: number = 10): Token[] => {
  const tokens: Token[] = [];
  let remaining = totalValue;
  let count = 0;
  while (remaining >= preferredDenom) {
    tokens.push({ id: `${baseId}-base-${count++}`, value: preferredDenom, spent: false });
    remaining -= preferredDenom;
  }
  if (remaining >= 0.01) {
    tokens.push({ id: `${baseId}-base-${count++}`, value: Math.round(remaining * 100) / 100, spent: false });
  }
  return tokens;
};

export const useBudgetState = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const [resetBriefing, setResetBriefing] = useState<any>(null);
  const clearBriefing = useCallback(() => setResetBriefing(null), []);

  const getStartOfBudgetWeek = useCallback(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  }, []);

  const { data: budgetState, isLoading: isStateLoading, isError } = useQuery({
    queryKey: ['budgetState', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_budget_state')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        return { 
          user_id: userId!, 
          current_tokens: initialModules, 
          gear_travel_fund: 0, 
          annual_income: DEFAULT_ANNUAL_INCOME,
          last_reset_date: getStartOfBudgetWeek(),
          updated_at: new Date().toISOString()
        } as WeeklyBudgetState;
      }
      return data as WeeklyBudgetState;
    },
    enabled: !!userId,
  });

  const { data: transactions = [], isLoading: isTxLoading } = useQuery({
    queryKey: ['budgetTransactions', userId, budgetState?.last_reset_date],
    queryFn: async () => {
      if (!budgetState?.last_reset_date) return [];
      
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', budgetState.last_reset_date)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BudgetTransaction[];
    },
    enabled: !!userId && !!budgetState?.last_reset_date,
  });

  const modules = useMemo(() => {
    if (!budgetState) return [];

    const resetDate = startOfDay(parseISO(budgetState.last_reset_date));
    const baseModules: Module[] = JSON.parse(JSON.stringify(budgetState.current_tokens));

    return baseModules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        const categoryTransactions = transactions.filter(t => {
          const txDate = parseISO(t.created_at);
          return t.category_id === category.id && (isAfter(txDate, resetDate) || txDate.getTime() === resetDate.getTime());
        });

        const totalSpentAmount = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const freshTokens = generateTokens(category.id, category.baseValue, category.tokenValue || 10);
        
        let remainingSpentPool = totalSpentAmount;
        const updatedTokens = freshTokens.map(token => {
          if (remainingSpentPool >= token.value - 0.001) {
            remainingSpentPool -= token.value;
            return { ...token, spent: true };
          } else if (remainingSpentPool > 0) {
            remainingSpentPool = 0;
            return { ...token, spent: true };
          }
          return token;
        });

        if (remainingSpentPool > 0.01) {
          updatedTokens.push({
            id: `${category.id}-overage-${Date.now()}`,
            value: Math.round(remainingSpentPool * 100) / 100,
            spent: true
          });
        }

        return { ...category, tokens: updatedTokens };
      })
    }));
  }, [budgetState, transactions]);

  const totalSpentWeekly = useMemo(() => {
    if (!budgetState) return 0;
    const resetDate = startOfDay(parseISO(budgetState.last_reset_date));
    
    return transactions
      .filter(t => {
        const txDate = parseISO(t.created_at);
        return t.category_id !== FUEL_CATEGORY_ID && (isAfter(txDate, resetDate) || txDate.getTime() === resetDate.getTime());
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions, budgetState]);

  const { data: spentToday = 0, refetch: refetchSpentToday } = useQuery({
    queryKey: ['spentToday', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_daily_spent_amount', { p_user_id: userId });
      if (error) throw error;
      return Number(data || 0);
    },
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<WeeklyBudgetState>) => {
      const payload = { ...data, user_id: userId, updated_at: new Date().toISOString() };
      return await supabase.from('weekly_budget_state').upsert(payload, { onConflict: 'user_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetState', userId] });
      queryClient.invalidateQueries({ queryKey: ['budgetTransactions', userId] });
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    }
  });

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from('budget_transactions').delete().eq('id', id);
    if (error) {
      toast.error("Failed to undo: " + error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['budgetTransactions', userId] });
    queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    toast.success("Transaction undone");
  }, [userId, queryClient]);

  const handleTokenSpend = useCallback(async (catId: string, tokenId: string) => {
    const category = modules.flatMap(m => m.categories).find(c => c.id === catId);
    const token = category?.tokens.find(t => t.id === tokenId);
    
    if (!token || token.spent) return;

    const { data, error } = await supabase.from('budget_transactions').insert({
      user_id: userId!,
      amount: token.value,
      category_id: catId,
      transaction_type: 'token_spend'
    }).select().single();

    if (error) {
      toast.error("Failed to log spend: " + error.message);
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['budgetTransactions', userId] }),
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] })
    ]);
    
    toast.success(`Spent ${formatCurrency(token.value)} in ${category?.name}`, {
      action: {
        label: "Undo",
        onClick: () => deleteTransaction(data.id)
      }
    });
  }, [modules, userId, queryClient, deleteTransaction]);

  const handleCustomSpend = useCallback(async (categoryId: string, amount: number) => {
    const { data, error } = await supabase.from('budget_transactions').insert({
      user_id: userId!,
      amount,
      category_id: categoryId,
      transaction_type: 'custom_spend'
    }).select().single();

    if (error) {
      toast.error("Failed to log custom spend: " + error.message);
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['budgetTransactions', userId] }),
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] })
    ]);
    
    toast.success(`Logged ${formatCurrency(amount)} custom spend`, {
      action: {
        label: "Undo",
        onClick: () => deleteTransaction(data.id)
      }
    });
  }, [userId, queryClient, deleteTransaction]);

  const handleGenericSpend = useCallback(async (amount: number) => {
    return handleCustomSpend(GENERIC_CATEGORY_ID, amount);
  }, [handleCustomSpend]);

  const handleFullReset = useCallback(async () => {
    await saveMutation.mutateAsync({ 
      current_tokens: initialModules,
      gear_travel_fund: 0,
      last_reset_date: getStartOfBudgetWeek()
    });
    toast.success("Budget fully reset.");
  }, [saveMutation, getStartOfBudgetWeek]);

  const handleFundAdjustment = useCallback(async (amount: number) => {
    await saveMutation.mutateAsync({ gear_travel_fund: amount });
    toast.success(`Fund adjusted to ${formatCurrency(amount)}`);
  }, [saveMutation]);

  const resetToInitialBudgets = useCallback(async () => {
    await saveMutation.mutateAsync({ current_tokens: initialModules });
    toast.success("Reset to initial budgets.");
  }, [saveMutation]);

  const handleMondayReset = useCallback(async () => {
    const mondayDate = getStartOfBudgetWeek();
    await saveMutation.mutateAsync({ last_reset_date: mondayDate });
    toast.success(`Budget week reset to Monday, ${mondayDate}`);
  }, [saveMutation, getStartOfBudgetWeek]);

  return {
    modules,
    transactions,
    totalSpent: totalSpentWeekly,
    spentToday,
    refetchSpentToday,
    resetBriefing,
    clearBriefing,
    gearTravelFund: budgetState?.gear_travel_fund || 0,
    config: { 
      annualIncome: budgetState?.annual_income || DEFAULT_ANNUAL_INCOME, 
      calculationMode: 'percentage', 
      payFrequency: 'weekly' 
    },
    isLoading: isStateLoading || isTxLoading,
    isError,
    handleCustomSpend,
    handleTokenSpend,
    handleGenericSpend,
    handleMondayReset,
    handleFullReset,
    handleFundAdjustment,
    resetToInitialBudgets,
    deleteTransaction,
    saveStrategy: async (income: number, updatedModules: Module[]) => {
      return await saveMutation.mutateAsync({ 
        annual_income: income, 
        current_tokens: updatedModules 
      });
    }
  };
};