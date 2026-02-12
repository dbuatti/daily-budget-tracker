"use client";

import { useCallback, useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack_react-query';
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
  console.log('[useBudgetState] >>> START MERGE');
  
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
  const [briefingData, setBriefingData] = useState<any>(null);

  const { data: state, isLoading } = useQuery({
    queryKey: ['budgetState', userId],
    queryFn: async () => {
      const { data } = await supabase.from('weekly_budget_state').select('*').eq('user_id', userId).single();
      if (!data) return { user_id: userId, current_tokens: initialModules, gear_travel_fund: 0, annual_income: DEFAULT_ANNUAL_INCOME };
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

    console.log('[useBudgetState] Running Transaction Reconciliation...');
    const { data: txs } = await supabase.rpc('get_recent_transactions', { p_user_id: userId, p_limit: 100 });
    if (!txs) return;

    // Filter for current week (simplified: last 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const currentWeekTxs = (txs as any[]).filter(t => new Date(t.created_at) >= weekStart);

    let hasChanges = false;
    const updatedModules = state.current_tokens.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        const catTxs = currentWeekTxs.filter(t => t.category_id === category.id);
        const totalTxSpent = catTxs.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalTokenSpent = category.tokens.filter(t => t.spent).reduce((sum, t) => sum + t.value, 0);

        if (totalTxSpent > totalTokenSpent + 0.01) {
          const diff = Math.round((totalTxSpent - totalTokenSpent) * 100) / 100;
          console.log(`[useBudgetState] Reconciling ${category.name}: Adding $${diff} adjustment token.`);
          hasChanges = true;
          return {
            ...category,
            tokens: [...category.tokens, { id: `sync-${category.id}-${Date.now()}`, value: diff, spent: true }]
          };
        }
        return category;
      })
    }));

    if (hasChanges) {
      await saveMutation.mutateAsync({ current_tokens: updatedModules });
      toast.info("Budget synced with transaction history.");
    }
  }, [state, userId, saveMutation]);

  // Run reconciliation once on load
  useEffect(() => { if (state) reconcile(); }, [!!state]);

  const modules = state?.current_tokens || [];
  const totalSpentWeekly = useMemo(() => {
    return modules.reduce((acc, m) => acc + m.categories.reduce((cAcc, c) => 
      c.id === FUEL_CATEGORY_ID ? cAcc : cAcc + c.tokens.filter(t => t.spent).reduce((tAcc, t) => tAcc + t.value, 0)
    , 0), 0);
  }, [modules]);

  const handleCustomSpend = useCallback(async (categoryId: string, amount: number) => {
    const updatedModules = modules.map(m => ({
      ...m,
      categories: m.categories.map(c => {
        if (c.id === categoryId) {
          const newToken = { id: `custom-${categoryId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, value: amount, spent: true };
          return { ...c, tokens: [...c.tokens, newToken] };
        }
        return c;
      })
    }));

    const category = modules.flatMap(m => m.categories).find(c => c.id === categoryId);
    await supabase.from('budget_transactions').insert({
      user_id: userId!,
      amount,
      category_id: categoryId,
      category_name: category?.name || 'Unknown',
      transaction_type: 'custom_spend'
    });

    await saveMutation.mutateAsync({ current_tokens: updatedModules });
    toast.success(`Logged ${formatCurrency(amount)}`);
  }, [modules, userId, saveMutation]);

  return {
    modules,
    totalSpent: totalSpentWeekly,
    gearTravelFund: state?.gear_travel_fund || 0,
    config: { annualIncome: state?.annual_income || DEFAULT_ANNUAL_INCOME, calculationMode: 'percentage', payFrequency: 'weekly' },
    isLoading,
    handleCustomSpend,
    handleTokenSpend: async (catId: string, tokenId: string) => {
        const updatedModules = modules.map(m => ({
            ...m,
            categories: m.categories.map(c => {
              if (c.id === catId) {
                return { ...c, tokens: c.tokens.map(t => t.id === tokenId ? { ...t, spent: true } : t) };
              }
              return c;
            })
          }));
          const token = modules.flatMap(m => m.categories).find(c => c.id === catId)?.tokens.find(t => t.id === tokenId);
          await supabase.from('budget_transactions').insert({
            user_id: userId!,
            amount: token?.value || 0,
            category_id: catId,
            transaction_type: 'token_spend'
          });
          await saveMutation.mutateAsync({ current_tokens: updatedModules });
    },
    reconcile
  };
};