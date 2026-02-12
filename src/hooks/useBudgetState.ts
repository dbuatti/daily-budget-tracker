import { useCallback, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Module, Category, UserBudgetConfig } from '@/types/budget';
import { WeeklyBudgetState } from '@/types/supabase';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { GENERIC_MODULE_ID, WEEKLY_BUDGET_TOTAL, initialModules, FUEL_CATEGORY_ID, GENERIC_CATEGORY_ID, DEFAULT_ANNUAL_INCOME, WEEKS_IN_YEAR } from '@/data/budgetData';

// Helper to generate tokens based on value and denomination
const generateTokens = (baseId: string, totalValue: number, preferredDenom: number = 10) => {
  const tokens = [];
  let remaining = totalValue;
  let count = 0;
  while (remaining >= preferredDenom) {
    tokens.push({ id: `${baseId}-${count++}`, value: preferredDenom, spent: false });
    remaining -= preferredDenom;
  }
  if (remaining >= 1) {
    tokens.push({ id: `${baseId}-${count++}`, value: Math.round(remaining * 100) / 100, spent: false });
  }
  return tokens;
};

const mergeBudgetState = (savedModules: Module[], initialModules: Module[]): Module[] => {
  const mergedModules: Module[] = JSON.parse(JSON.stringify(initialModules));
  const savedModuleMap = new Map(savedModules.map(m => [m.id, m]));
  const mergedModuleMap = new Map(mergedModules.map(m => [m.id, m]));

  for (const initialModule of mergedModules) {
    const savedModule = savedModuleMap.get(initialModule.id);
    if (savedModule) {
      const savedCategoryMap = new Map(savedModule.categories.map(c => [c.id, c]));
      initialModule.categories = initialModule.categories.map(initialCategory => {
        const savedCategory = savedCategoryMap.get(initialCategory.id);
        if (savedCategory) {
          initialCategory.baseValue = savedCategory.baseValue;
          initialCategory.percentage = savedCategory.percentage;
          initialCategory.mode = savedCategory.mode;
          initialCategory.iconName = savedCategory.iconName;
          
          const baseTokens = JSON.parse(JSON.stringify(initialCategory.tokens));
          const savedTokenMap = new Map(savedCategory.tokens.map(t => [t.id, t]));
          const finalTokens = baseTokens.map(baseToken => {
              const savedToken = savedTokenMap.get(baseToken.id);
              return savedToken ? { ...baseToken, spent: savedToken.spent } : baseToken;
          });
          for (const savedToken of savedCategory.tokens) {
              if (!baseTokens.some(t => t.id === savedToken.id)) {
                  finalTokens.push(savedToken);
              }
          }
          initialCategory.tokens = finalTokens;
        }
        return initialCategory;
      });
    }
  }
  for (const savedModule of savedModules) {
      if (!mergedModuleMap.has(savedModule.id)) {
          mergedModules.push(savedModule);
      }
  }
  return mergedModules;
};

const fetchBudgetState = async (userId: string): Promise<WeeklyBudgetState> => {
  const { data, error } = await supabase
    .from('weekly_budget_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  
  if (data) {
    const state = data as WeeklyBudgetState;
    state.current_tokens = mergeBudgetState(state.current_tokens, initialModules);
    return state;
  }
  
  return {
    user_id: userId,
    current_tokens: initialModules,
    gear_travel_fund: 0,
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
    mutationFn: (data: Partial<WeeklyBudgetState>) => 
      supabase.from('weekly_budget_state').upsert({
        user_id: userId!,
        ...data,
        updated_at: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetState', userId] });
    },
  });

  const modules: Module[] = state?.current_tokens || [];
  const gearTravelFund = state?.gear_travel_fund || 0;
  const config: UserBudgetConfig = state?.config || { annualIncome: DEFAULT_ANNUAL_INCOME, calculationMode: 'percentage', payFrequency: 'weekly' };

  const totalSpentWeekly = useMemo(() => modules.reduce((total, module) => 
    total + module.categories.reduce((catTotal, category) => {
      if (category.id === FUEL_CATEGORY_ID) return catTotal;
      return catTotal + category.tokens.filter(t => t.spent).reduce((tokenTotal, token) => tokenTotal + token.value, 0)
    }, 0)
  , 0), [modules]);

  const handleTokenSpend = useCallback(async (categoryId: string, tokenId: string) => {
    const updatedModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            tokens: category.tokens.map(token => token.id === tokenId ? { ...token, spent: true } : token)
          };
        }
        return category;
      })
    }));

    const amount = modules.flatMap(m => m.categories).find(c => c.id === categoryId)?.tokens.find(t => t.id === tokenId)?.value || 0;

    await supabase.from('budget_transactions').insert({
      user_id: userId!,
      amount,
      category_id: categoryId,
      transaction_type: 'token_spend'
    });

    await saveMutation.mutateAsync({ current_tokens: updatedModules });
    toast.success(`Logged ${formatCurrency(amount)}`);
    queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
  }, [modules, userId, saveMutation, queryClient]);

  const handleCustomSpend = useCallback(async (categoryId: string, amount: number) => {
    const updatedModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        if (category.id === categoryId) {
          const newToken = { id: `custom-${categoryId}-${Date.now()}`, value: amount, spent: true };
          return { ...category, tokens: [...category.tokens, newToken] };
        }
        return category;
      })
    }));

    await supabase.from('budget_transactions').insert({
      user_id: userId!,
      amount,
      category_id: categoryId,
      transaction_type: 'custom_spend'
    });

    await saveMutation.mutateAsync({ current_tokens: updatedModules });
    toast.success(`Logged custom spend: ${formatCurrency(amount)}`);
    queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
  }, [modules, userId, saveMutation, queryClient]);

  const handleGenericSpend = useCallback(async (amount: number) => {
    await supabase.from('budget_transactions').insert({
      user_id: userId!,
      amount,
      transaction_type: 'generic_spend'
    });
    toast.success(`Logged generic spend: ${formatCurrency(amount)}`);
    queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
  }, [userId, queryClient]);

  const saveStrategy = useCallback(async (newIncome: number, updatedModules: Module[]) => {
    // Recalculate tokens for all categories based on new income/strategy
    const weeklyIncome = newIncome / WEEKS_IN_YEAR;
    
    const finalModules = updatedModules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        let newBaseValue = category.baseValue;
        if (category.mode === 'percentage') {
          newBaseValue = Math.round((weeklyIncome * (category.percentage || 0) / 100) * 100) / 100;
        }
        
        // Preserve spent status if possible, otherwise generate fresh tokens
        const spentAmount = category.tokens.filter(t => t.spent).reduce((sum, t) => sum + t.value, 0);
        const freshTokens = generateTokens(category.id, newBaseValue, category.tokenValue || 10);
        
        // Simple heuristic: mark tokens as spent until we reach the spentAmount
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
          baseValue: newBaseValue,
          tokens: tokensWithSpent
        };
      })
    }));

    await saveMutation.mutateAsync({ 
      current_tokens: finalModules, 
      config: { ...config, annualIncome: newIncome } 
    });
    toast.success('Budget strategy saved!');
  }, [config, saveMutation]);

  const handleMondayReset = useCallback(async () => {
    const totalBudget = modules.reduce((sum, m) => sum + m.categories.reduce((cs, c) => c.id !== FUEL_CATEGORY_ID ? cs + c.baseValue : cs, 0), 0);
    const difference = totalBudget - totalSpentWeekly;
    let newFund = gearTravelFund + (difference > 0 ? difference : 0);

    const resetModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        if (category.id === FUEL_CATEGORY_ID) return category;
        return { ...category, tokens: category.tokens.map(t => ({ ...t, spent: false })) };
      })
    }));

    await saveMutation.mutateAsync({ current_tokens: resetModules, gear_travel_fund: newFund });
    toast.success('Weekly reset complete!');
    setBriefingData({ totalSpent: totalSpentWeekly, totalBudget, totalSurplus: Math.max(0, difference), newGearTravelFund: newFund, categoryBriefings: [] });
  }, [modules, totalSpentWeekly, gearTravelFund, saveMutation]);

  return {
    modules,
    gearTravelFund,
    totalSpent: totalSpentWeekly,
    spentToday,
    config,
    isLoading,
    isError,
    handleTokenSpend,
    handleCustomSpend,
    handleGenericSpend,
    saveStrategy,
    handleMondayReset,
    refetchSpentToday,
    resetBriefing: briefingData,
    clearBriefing: () => setBriefingData(null),
  };
};