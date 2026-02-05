import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Module, Category, Token } from '@/types/budget';
import { initialModules, WEEKLY_BUDGET_TOTAL, GENERIC_MODULE_ID, GENERIC_CATEGORY_ID } from '@/data/budgetData';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

// Constants
const WEEKLY_STATE_TABLE = 'weekly_budget_state';
const BUDGET_TRANSACTIONS_TABLE = 'budget_transactions';

// Types
interface WeeklyBudgetState {
  user_id: string;
  current_tokens: Module[];
  gear_travel_fund: number;
  last_reset_date: string;
  updated_at: string;
}

// Helper to convert Module[] to a map for easy updates
const modulesToMap = (modules: Module[]): Map<string, Category> => {
  const map = new Map<string, Category>();
  modules.forEach(module => {
    module.categories.forEach(category => {
      map.set(category.id, category);
    });
  });
  return map;
};

// Helper to convert map back to Module[]
const mapToModules = (categoryMap: Map<string, Category>, originalModules: Module[]): Module[] => {
  return originalModules.map(module => ({
    ...module,
    categories: module.categories.map(category => categoryMap.get(category.id) || category)
  }));
};

// Fetch weekly state from database
const fetchBudgetState = async (userId: string): Promise<{
  modules: Module[];
  gearTravelFund: number;
  lastResetDate: string;
}> => {
  console.log('[useBudgetState] fetchBudgetState called for user:', userId);
  
  const { data, error } = await supabase
    .from(WEEKLY_STATE_TABLE)
    .select('current_tokens, gear_travel_fund, last_reset_date')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[useBudgetState] Error fetching weekly state:', error);
    if (error.code === 'PGRST116') {
      // No row exists yet - initialize with defaults
      console.log('[useBudgetState] No state found, initializing...');
      return {
        modules: initialModules,
        gearTravelFund: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
      };
    }
    throw error;
  }

  if (!data) {
    throw new Error('No data returned from weekly state query');
  }

  const state = data as WeeklyBudgetState;
  console.log('[useBudgetState] Successfully fetched state:', {
    moduleCount: state.current_tokens.length,
    gearTravelFund: state.gear_travel_fund,
    lastResetDate: state.last_reset_date,
  });

  return {
    modules: state.current_tokens,
    gearTravelFund: state.gear_travel_fund,
    lastResetDate: state.last_reset_date,
  };
};

// Fetch daily spent amount from RPC
const fetchSpentToday = async (userId: string): Promise<number> => {
  console.log('[useBudgetState] fetchSpentToday called for user:', userId);
  console.log('[useBudgetState] Calling Supabase RPC get_daily_spent_amount...');
  
  try {
    const { data, error } = await supabase.rpc('get_daily_spent_amount', { p_user_id: userId });

    if (error) {
      console.error('[useBudgetState] Error from get_daily_spent_amount RPC:', error);
      throw new Error(error.message);
    }
    
    const numericData = parseFloat(data as string) || 0;
    console.log('[useBudgetState] RPC returned raw data:', data, 'type:', typeof data, 'parsed to:', numericData);
    return numericData;
  } catch (err) {
    console.error('[useBudgetState] Exception in fetchSpentToday:', err);
    throw err;
  }
};

export const useBudgetState = () => {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();

  console.log('[useBudgetState] Hook called, userId:', userId);

  // Fetch initial weekly state
  const { data: dbState, isLoading: isLoadingWeekly, isError: isErrorWeekly } = useQuery({
    queryKey: [WEEKLY_STATE_TABLE, userId],
    queryFn: () => fetchBudgetState(userId!),
    enabled: !!userId,
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      return true;
    }
  });
  
  // Fetch daily spent amount
  const { data: spentToday = 0, isLoading: isLoadingDaily, isError: isErrorDaily, refetch: refetchDailySpent } = useQuery({
    queryKey: ['spentToday', userId],
    queryFn: () => fetchSpentToday(userId!),
    enabled: !!userId,
    initialData: 0,
  });

  // Log whenever spentToday changes
  useEffect(() => {
    console.log('[useBudgetState] spentToday updated:', spentToday, 'isLoading:', isLoadingDaily, 'isError:', isErrorDaily);
  }, [spentToday, isLoadingDaily, isErrorDaily]);

  // Derived state from dbState
  const modules: Module[] = dbState?.modules || initialModules;
  const gearTravelFund: number = dbState?.gearTravelFund || 0;
  const lastResetDate: string = dbState?.lastResetDate || new Date().toISOString().split('T')[0];

  // Calculate total spent this week (sum of all spent tokens across all categories)
  const totalSpentWeekly = modules.reduce((total, module) => {
    return total + module.categories.reduce((catTotal, category) => {
      return catTotal + category.tokens
        .filter(token => token.spent)
        .reduce((sum, token) => sum + token.value, 0);
    }, 0);
  }, 0);

  console.log('[useBudgetState] Derived state - totalSpentWeekly:', totalSpentWeekly, 'gearTravelFund:', gearTravelFund);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ modules, gearTravelFund }: { modules: Module[]; gearTravelFund: number }) => {
      if (!user) throw new Error('User not authenticated');

      console.log('[useBudgetState] saveMutation.mutateAsync called with:', { 
        moduleCount: modules.length, 
        gearTravelFund 
      });

      const { error } = await supabase
        .from(WEEKLY_STATE_TABLE)
        .upsert({
          user_id: user.id,
          current_tokens: modules,
          gear_travel_fund: gearTravelFund,
          last_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[useBudgetState] Error saving state:', error);
        throw error;
      }

      console.log('[useBudgetState] State saved successfully');
    },
    onSuccess: async () => {
      console.log('[useBudgetState] saveMutation onSuccess - invalidating queries');
      await queryClient.invalidateQueries({ queryKey: [WEEKLY_STATE_TABLE, userId] });
      await queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    },
  });

  // Log transaction mutation
  const logTransactionMutation = useMutation({
    mutationFn: async ({
      amount,
      categoryId,
      transactionType,
    }: {
      amount: number;
      categoryId: string;
      transactionType: 'token_spend' | 'custom_spend' | 'generic_spend';
    }) => {
      if (!user) throw new Error('User not authenticated');

      console.log('[useBudgetState] logTransactionMutation.mutateAsync called with:', { 
        amount, 
        categoryId, 
        transactionType,
        userId: user.id 
      });

      const { error } = await supabase
        .from(BUDGET_TRANSACTIONS_TABLE)
        .insert({
          user_id: user.id,
          amount,
          category_id: categoryId,
          transaction_type: transactionType,
        });

      if (error) {
        console.error('[useBudgetState] Error logging transaction:', error);
        throw error;
      }

      console.log('[useBudgetState] Transaction logged successfully');
    },
    onSuccess: async () => {
      console.log('[useBudgetState] logTransactionMutation onSuccess - invalidating spentToday query');
      await queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    },
  });

  // Briefing state
  const [briefing, setBriefing] = useState<{
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
  } | null>(null);

  // Handle token spend
  const handleTokenSpend = useCallback(async (categoryId: string, tokenId: string) => {
    console.log('[useBudgetState] handleTokenSpend called with:', { categoryId, tokenId });
    
    try {
      // Find the category and token
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
      
      // Log the transaction
      await logTransactionMutation.mutateAsync({ amount, categoryId, transactionType: 'token_spend' });

      console.log('[useBudgetState] About to save state with updated modules');
      
      // Save updated state
      await saveMutation.mutateAsync({ modules: updatedModules, gearTravelFund });

      toast.success(`Logged ${formatCurrency(amount)}`);
    } catch (error) {
      console.error('Error spending token:', error);
      toast.error('Failed to log transaction');
    }
  }, [modules, gearTravelFund, logTransactionMutation, saveMutation]);

  // Handle generic spend (from QuickSpendButtons)
  const handleGenericSpend = useCallback(async (amount: number) => {
    console.log('[useBudgetState] handleGenericSpend called with amount:', amount);
    try {
      await logTransactionMutation.mutateAsync({ amount, categoryId: GENERIC_CATEGORY_ID, transactionType: 'generic_spend' });
      toast.success(`Logged generic spend of ${formatCurrency(amount)}`);
    } catch (error) {
      console.error('Error logging generic spend:', error);
      toast.error('Failed to log generic spend');
    }
  }, [logTransactionMutation]);

  // Handle custom spend (from AddTokenDialog)
  const handleCustomSpend = useCallback(async (categoryId: string, amount: number) => {
    console.log('[useBudgetState] handleCustomSpend called with:', { categoryId, amount });
    try {
      await logTransactionMutation.mutateAsync({ amount, categoryId, transactionType: 'custom_spend' });
      toast.success(`Logged custom spend of ${formatCurrency(amount)} in category`);
    } catch (error) {
      console.error('Error logging custom spend:', error);
      toast.error('Failed to log custom spend');
    }
  }, [logTransactionMutation]);

  // Handle Monday reset
  const handleMondayReset = useCallback(async () => {
    try {
      // Calculate surplus/deficit for each category
      const categoryMap = modulesToMap(modules);
      const categoryBriefings: Array<{
        categoryName: string;
        difference: number;
        newBaseValue?: number;
      }> = [];
      
      let totalSurplus = 0;
      let totalDeficit = 0;

      // For each category, calculate the difference between initial budget and total spent
      categoryMap.forEach((category, categoryId) => {
        const initialBudget = category.baseValue;
        const totalSpentInCategory = category.tokens
          .filter(t => t.spent)
          .reduce((sum, token) => sum + token.value, 0);
        
        const difference = initialBudget - totalSpentInCategory;
        
        if (difference > 0) {
          // Surplus - add to fund
          totalSurplus += difference;
        } else if (difference < 0) {
          // Deficit - reduce next week's budget
          totalDeficit += Math.abs(difference);
          // For deficits, we'll adjust the base value for next week
          const adjustmentFactor = 0.5; // Adjust by 50% of deficit
          const newBaseValue = Math.max(0, initialBudget - (Math.abs(difference) * adjustmentFactor));
          
          categoryMap.set(categoryId, {
            ...category,
            baseValue: newBaseValue,
            tokens: category.tokens.map(token => ({ ...token, spent: false })),
          });
          
          categoryBriefings.push({
            categoryName: category.name,
            difference: difference,
            newBaseValue: newBaseValue,
          });
        } else {
          categoryMap.set(categoryId, {
            ...category,
            tokens: category.tokens.map(token => ({ ...token, spent: false })),
          });
        }
      });

      const newGearTravelFund = gearTravelFund + totalSurplus;
      const updatedModules = mapToModules(categoryMap, initialModules);

      // Save the reset state
      await saveMutation.mutateAsync({ modules: updatedModules, gearTravelFund: newGearTravelFund });

      setBriefing({
        totalSpent: totalSpentWeekly,
        totalBudget: WEEKLY_BUDGET_TOTAL,
        totalSurplus,
        totalDeficit,
        newGearTravelFund,
        categoryBriefings,
      });

      toast.success('Week reset successfully!');
    } catch (error) {
      console.error('Error resetting week:', error);
      toast.error('Failed to reset week');
    }
  }, [modules, gearTravelFund, totalSpentWeekly, saveMutation]);

  // Handle fund adjustment (for debugging)
  const handleFundAdjustment = useCallback(async (newFund: number) => {
    try {
      await saveMutation.mutateAsync({ modules, gearTravelFund: newFund });
      toast.success(`Fund adjusted to ${formatCurrency(newFund)}`);
    } catch (error) {
      console.error('Error adjusting fund:', error);
      toast.error('Failed to adjust fund');
    }
  }, [modules, gearTravelFund, saveMutation]);

  // Handle full reset (for debugging)
  const handleFullReset = useCallback(async () => {
    try {
      const resetModules = initialModules.map(module => ({
        ...module,
        categories: module.categories.map(category => ({
          ...category,
          tokens: category.tokens.map(token => ({ ...token, spent: false })),
        })),
      }));

      await saveMutation.mutateAsync({ modules: resetModules, gearTravelFund: 0 });
      toast.success('Full budget reset completed');
    } catch (error) {
      console.error('Error performing full reset:', error);
      toast.error('Failed to reset budget');
    }
  }, [saveMutation]);

  // Clear briefing
  const clearBriefing = useCallback(() => {
    setBriefing(null);
  }, []);

  const isLoading = isLoadingWeekly || isLoadingDaily || saveMutation.isPending || logTransactionMutation.isPending;
  const isError = isErrorWeekly || isErrorDaily;

  console.log('[useBudgetState] Returning from hook - isLoading:', isLoading, 'isError:', isError);

  return {
    modules,
    gearTravelFund,
    totalSpent: totalSpentWeekly,
    spentToday,
    isLoading,
    isError,
    resetBriefing: briefing,
    clearBriefing,
    handleTokenSpend,
    handleGenericSpend,
    handleCustomSpend,
    handleMondayReset,
    handleFundAdjustment,
    handleFullReset,
  };
};