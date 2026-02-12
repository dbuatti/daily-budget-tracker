"use client";

import { useCallback, useState, useMemo, useEffect } from 'react';
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

const mergeBudgetState = (savedModules: Module[], initialModules: Module[]): Module[] => {
  console.log('[useBudgetState] >>> START MERGE & AUDIT');
  
  if (!savedModules || savedModules.length === 0) {
    return JSON.parse(JSON.stringify(initialModules));
  }

  const mergedModules: Module[] = JSON.parse(JSON.stringify(savedModules));
  const savedModuleIds = new Set(mergedModules.map(m => m.id));

  for (const initialModule of initialModules) {
    if (!savedModuleIds.has(initialModule.id)) {
      mergedModules.push(JSON.parse(JSON.stringify(initialModule)));
    } else {
      const mergedModule = mergedModules.find(m => m.id === initialModule.id)!;
      const savedCategoryIds = new Set(mergedModule.categories.map(c => c.id));
      for (const initialCategory of initialModule.categories) {
        if (!savedCategoryIds.has(initialCategory.id)) {
          mergedModule.categories.push(JSON.parse(JSON.stringify(initialCategory)));
        }
      }
    }
  }

  // Self-Healing: Ensure base tokens always sum to baseValue
  mergedModules.forEach(module => {
    module.categories.forEach(category => {
      const baseTokens = category.tokens.filter(t => t.id.includes('-base-'));
      const otherTokens = category.tokens.filter(t => !t.id.includes('-base-'));
      const sumOfBase = baseTokens.reduce((sum, t) => sum + t.value, 0);

      // Log audit for key categories
      if (category.id === 'A1') {
        console.log(`[useBudgetState] ${category.name} (${category.id}) Audit:`, {
          baseValue: category.baseValue,
          sumOfBase,
          baseTokenCount: baseTokens.length,
          otherTokenCount: otherTokens.length
        });
      }

      if (Math.abs(sumOfBase - category.baseValue) > 0.01) {
        console.warn(`[useBudgetState] Healing ${category.name}: Base tokens sum to ${sumOfBase}, expected ${category.baseValue}`);
        const totalBaseSpent = baseTokens.filter(t => t.spent).reduce((sum, t) => sum + t.value, 0);
        const freshBase = generateTokens(category.id, category.baseValue, category.tokenValue || 10);
        
        let pool = totalBaseSpent;
        const healedBase = freshBase.map(t => {
          if (pool >= t.value) { pool -= t.value; return { ...t, spent: true }; }
          if (pool > 0) { pool = 0; return { ...t, spent: true }; }
          return t;
        });
        category.tokens = [...healedBase, ...otherTokens];
      }
    });
  });

  return mergedModules;
};

export const useBudgetState = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: state, isLoading, isError } = useQuery({
    queryKey: ['budgetState', userId],
    queryFn: async () => {
      console.log(`[useBudgetState] Fetching state for user: ${userId}`);
      const { data, error } = await supabase.from('weekly_budget_state').select('*').eq('user_id', userId).single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        return { 
          user_id: userId, 
          current_tokens: initialModules, 
          gear_travel_fund: 0, 
          annual_income: DEFAULT_ANNUAL_INCOME,
          last_reset_date: new Date().toISOString().split('T')[0]
        };
      }
      
      const s = data as WeeklyBudgetState;
      s.current_tokens = mergeBudgetState(s.current_tokens, initialModules);
      return s;
    },
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<WeeklyBudgetState>) => {
      const payload = { ...data, user_id: userId, updated_at: new Date().toISOString() };
      return await supabase.from('weekly_budget_state').upsert(payload, { onConflict: 'user_id' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgetState', userId] })
  });

  // RECONCILIATION LOGIC: Sync tokens with transaction history
  const reconcile = useCallback(async () => {
    if (!state || !userId) return;

    console.log('[useBudgetState] >>> START RECONCILIATION');
    
    // Fetch transactions since the last reset date
    const { data: txs, error: txError } = await supabase
      .from('budget_transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', state.last_reset_date)
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('[useBudgetState] Reconciliation failed to fetch transactions:', txError);
      return;
    }

    console.log(`[useBudgetState] Found ${txs?.length || 0} transactions since ${state.last_reset_date}`);

    let hasChanges = false;
    const updatedModules = state.current_tokens.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        const catTxs = (txs || []).filter(t => t.category_id === category.id);
        const totalTxSpent = catTxs.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalTokenSpent = category.tokens.filter(t => t.spent).reduce((sum, t) => sum + t.value, 0);

        if (category.id === 'A1') {
          console.log(`[useBudgetState] Reconcile Audit for ${category.name}:`, {
            totalTxSpent,
            totalTokenSpent,
            txCount: catTxs.length
          });
        }

        // If we've spent more in transactions than we have spent tokens, add a sync token
        if (totalTxSpent > totalTokenSpent + 0.01) {
          const diff = Math.round((totalTxSpent - totalTokenSpent) * 100) / 100;
          console.log(`[useBudgetState] Reconciling ${category.name}: Adding $${diff} sync token.`);
          hasChanges = true;
          return {
            ...category,
            tokens: [
              ...category.tokens, 
              { id: `sync-${category.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, value: diff, spent: true }
            ]
          };
        }
        return category;
      })
    }));

    if (hasChanges) {
      console.log('[useBudgetState] Reconciliation complete. Saving changes...');
      await saveMutation.mutateAsync({ current_tokens: updatedModules });
      toast.info("Budget synced with transaction history.");
    } else {
      console.log('[useBudgetState] Reconciliation complete. No changes needed.');
    }
  }, [state, userId, saveMutation]);

  // Run reconciliation when state is loaded
  useEffect(() => { 
    if (state) {
      reconcile();
    }
  }, [state?.updated_at, userId]); // Re-run if DB state updates or user changes

  const modules = state?.current_tokens || [];
  
  const totalSpentWeekly = useMemo(() => {
    return modules.reduce((acc, m) => acc + m.categories.reduce((cAcc, c) => 
      c.id === FUEL_CATEGORY_ID ? cAcc : cAcc + c.tokens.filter(t => t.spent).reduce((tAcc, t) => tAcc + t.value, 0)
    , 0), 0);
  }, [modules]);

  const handleTokenSpend = useCallback(async (catId: string, tokenId: string) => {
    const category = modules.flatMap(m => m.categories).find(c => c.id === catId);
    const token = category?.tokens.find(t => t.id === tokenId);
    
    if (!token || token.spent) return;

    const updatedModules = modules.map(m => ({
      ...m,
      categories: m.categories.map(c => {
        if (c.id === catId) {
          return { ...c, tokens: c.tokens.map(t => t.id === tokenId ? { ...t, spent: true } : t) };
        }
        return c;
      })
    }));

    // Log the transaction first
    await supabase.from('budget_transactions').insert({
      user_id: userId!,
      amount: token.value,
      category_id: catId,
      category_name: category?.name,
      transaction_type: 'token_spend'
    });

    // Update the state
    await saveMutation.mutateAsync({ current_tokens: updatedModules });
    toast.success(`Spent ${formatCurrency(token.value)} in ${category?.name}`);
  }, [modules, userId, saveMutation]);

  const handleCustomSpend = useCallback(async (categoryId: string, amount: number) => {
    const category = modules.flatMap(m => m.categories).find(c => c.id === categoryId);
    
    const updatedModules = modules.map(m => ({
      ...m,
      categories: m.categories.map(c => {
        if (c.id === categoryId) {
          const newToken = { 
            id: `custom-${categoryId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, 
            value: amount, 
            spent: true 
          };
          return { ...c, tokens: [...c.tokens, newToken] };
        }
        return c;
      })
    }));

    // Log the transaction
    await supabase.from('budget_transactions').insert({
      user_id: userId!,
      amount,
      category_id: categoryId,
      category_name: category?.name || 'Unknown',
      transaction_type: 'custom_spend'
    });

    await saveMutation.mutateAsync({ current_tokens: updatedModules });
    toast.success(`Logged ${formatCurrency(amount)} custom spend`);
  }, [modules, userId, saveMutation]);

  return {
    modules,
    totalSpent: totalSpentWeekly,
    gearTravelFund: state?.gear_travel_fund || 0,
    config: { 
      annualIncome: state?.annual_income || DEFAULT_ANNUAL_INCOME, 
      calculationMode: 'percentage', 
      payFrequency: 'weekly' 
    },
    isLoading,
    isError,
    handleCustomSpend,
    handleTokenSpend,
    reconcile,
    saveStrategy: async (income: number, updatedModules: Module[]) => {
      return await saveMutation.mutateAsync({ 
        annual_income: income, 
        current_tokens: updatedModules 
      });
    }
  };
};