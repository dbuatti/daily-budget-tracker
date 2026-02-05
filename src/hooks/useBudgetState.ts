import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Module } from '@/types/budget';
import { WeeklyBudgetState } from '@/types/supabase';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { GENERIC_MODULE_ID, WEEKLY_BUDGET_TOTAL, initialModules, FUEL_CATEGORY_ID, GENERIC_CATEGORY_ID } from '@/data/budgetData';

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
    const state = data as WeeklyBudgetState;
    if (!state.current_tokens || state.current_tokens.length === 0) {
      console.log('[fetchBudgetState] Found empty state, initializing from transactions...');
      try {
        const initializedState = await initializeStateFromTransactions(userId);
        return initializedState;
      } catch (err) {
        console.error('Failed to initialize from transactions:', err);
        // Fall back to initialModules
        return {
          user_id: userId,
          current_tokens: initialModules,
          gear_travel_fund: 0,
          last_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        };
      }
    }
    return state;
  }
  
  console.log('[fetchBudgetState] No state found, initializing from transactions...');
  try {
    const initializedState = await initializeStateFromTransactions(userId);
    return initializedState;
  } catch (err) {
    console.error('Failed to initialize from transactions:', err);
    return {
      user_id: userId,
      current_tokens: initialModules,
      gear_travel_fund: 0,
      last_reset_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };
  }

  async function initializeStateFromTransactions(userId: string): Promise<WeeklyBudgetState> {
    // Fetch all transactions for the user (limit to 1000 for safety)
    const { data: transactions, error: txError } = await supabase
      .from('budget_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1000);

    if (txError) {
      console.error('Error fetching transactions for initialization:', txError);
      throw txError;
    }

    // Deep clone initialModules to avoid mutating the constant
    const modules = JSON.parse(JSON.stringify(initialModules));

    // Process each transaction
    for (const tx of transactions || []) {
      const { amount, category_id, transaction_type } = tx;
      
      if (transaction_type === 'generic_spend') {
        // Find or create generic module
        let genericModule = modules.find(m => m.id === GENERIC_MODULE_ID);
        if (!genericModule) {
          genericModule = {
            id: GENERIC_MODULE_ID,
            name: 'Generic Spends',
            categories: [{
              id: GENERIC_CATEGORY_ID,
              name: 'Uncategorized',
              tokens: [],
              baseValue: 0
            }]
          };
          modules.push(genericModule);
        }
        const genericCategory = genericModule.categories[0];
        genericCategory.tokens.push({
          id: `generic-${tx.id}`,
          value: amount,
          spent: true
        });
        genericCategory.baseValue += amount;
      } else if (category_id) {
        let categoryFound = false;
        for (const module of modules) {
          const category = module.categories.find(c => c.id === category_id);
          if (category) {
            categoryFound = true;
            
            // Special handling for Fuel: always treat as custom spend, add new token
            if (category.id === FUEL_CATEGORY_ID) {
                const newToken = {
                    id: `custom-${category_id}-${tx.id}`,
                    value: amount,
                    spent: true
                };
                category.tokens.push(newToken);
                // Note: We do NOT update category.baseValue here, as baseValue represents the weekly budget.
            } else {
                // Standard category: Try to find an unspent token with the same amount
                const token = category.tokens.find(t => t.value === amount && !t.spent);
                if (token) {
                    token.spent = true;
                } else {
                    // Add a new custom token and mark as spent
                    const newToken = {
                        id: `custom-${category_id}-${tx.id}`,
                        value: amount,
                        spent: true
                    };
                    category.tokens.push(newToken);
                    category.baseValue += amount;
                }
            }
            break;
          }
        }
        if (!categoryFound) {
          // Category not found, add to generic
          let genericModule = modules.find(m => m.id === GENERIC_MODULE_ID);
          if (!genericModule) {
            genericModule = {
              id: GENERIC_MODULE_ID,
              name: 'Generic Spends',
              categories: [{
                id: GENERIC_CATEGORY_ID,
                name: 'Uncategorized',
                tokens: [],
                baseValue: 0
              }]
            };
            modules.push(genericModule);
          }
          const genericCategory = genericModule.categories[0];
          genericCategory.tokens.push({
            id: `generic-${tx.id}`,
            value: amount,
            spent: true
          });
          genericCategory.baseValue += amount;
        }
      }
      // else: token_spend without category_id? ignore
    }

    // Save the initialized state
    await saveBudgetState(userId, modules, 0);

    return {
      user_id: userId,
      current_tokens: modules,
      gear_travel_fund: 0,
      last_reset_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };
  }
};

const fetchSpentToday = async (userId: string): Promise<number> => {
  const { data, error } = await supabase.rpc('get_daily_spent_amount', { p_user_id: userId });
  
  if (error) {
    console.error('RPC Error:', error);
    throw new Error(error.message);
  }
  
  console.log('fetchSpentToday result:', data);
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

  const { data: spentTodayData, refetch: refetchSpentToday } = useQuery({
    queryKey: ['spentToday', userId],
    queryFn: () => fetchSpentToday(userId!),
    enabled: !!userId,
  });
  
  const spentToday = spentTodayData || 0;

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

  // Calculate total spent for WEEKLY budget (excluding long-term categories like Fuel)
  const totalSpentWeekly = modules.reduce((total, module) => 
    total + module.categories.reduce((catTotal, category) => {
      if (category.id === FUEL_CATEGORY_ID) {
        return catTotal; // Exclude Fuel spending from weekly total
      }
      return catTotal + category.tokens.filter(t => t.spent).reduce((tokenTotal, token) => tokenTotal + token.value, 0)
    }, 0)
  , 0);

  const handleTokenSpend = useCallback(async (categoryId: string, tokenId: string) => {
    console.log('[useBudgetState] handleTokenSpend CALLED with:', { categoryId, tokenId });
    
    try {
      let categoryFound = false;
      let tokenFound = false;
      let amount = 0;

      const updatedModules = modules.map(module => ({
        ...module,
        categories: module.categories.map(category => {
          if (category.id === categoryId) {
            categoryFound = true;
            const updatedTokens = category.tokens.map(token => {
              if (token.id === tokenId) {
                tokenFound = true;
                amount = token.value;
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

      await logTransactionMutation.mutateAsync({ amount, categoryId, transactionType: 'token_spend' });
      await saveMutation.mutateAsync({ modules: updatedModules, gearTravelFund });

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
            
            // For Fuel, we add the custom spend as a new token to track the 4-week spend.
            // For other categories, we also add it as a new token (custom spend).
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
      // 1. Calculate weekly surplus/deficit based on WEEKLY_BUDGET_TOTAL (which excludes Fuel)
      const totalSpent = totalSpentWeekly;
      const totalBudget = WEEKLY_BUDGET_TOTAL;
      const difference = totalBudget - totalSpent;
      
      let newFund = gearTravelFund;
      let categoryBriefings: Array<{ categoryName: string; difference: number; newBaseValue?: number }> = [];

      // Deep clone modules for modification
      let modulesToSave = JSON.parse(JSON.stringify(modules));
      
      // Find initial Fuel base value for reset
      const initialFuelCategory = initialModules.find(m => m.id === 'G')?.categories.find(c => c.id === FUEL_CATEGORY_ID);
      const initialFuelBaseValue = initialFuelCategory?.baseValue || 50;

      if (difference > 0) {
        // Surplus - add to fund
        newFund += difference;
      } else {
        // Deficit - reduce category budgets proportionally (excluding Fuel and Generic)
        const deficit = Math.abs(difference);
        
        // Calculate total base value of *weekly* categories only (A-F)
        const weeklyModules = initialModules.filter(m => m.id !== GENERIC_MODULE_ID && m.id !== 'G');
        const totalWeeklyBaseValue = weeklyModules.reduce((sum, module) => 
          sum + module.categories.reduce((catSum, cat) => catSum + cat.baseValue, 0)
        , 0);
        
        if (totalWeeklyBaseValue > 0) {
            const deficitRatio = deficit / totalWeeklyBaseValue;
            
            modulesToSave = modulesToSave.map(module => ({
              ...module,
              categories: module.categories.map(category => {
                if (category.id !== FUEL_CATEGORY_ID && category.id !== GENERIC_CATEGORY_ID) {
                    // Apply proportional deficit reduction to weekly categories
                    const adjustment = Math.round(category.baseValue * deficitRatio * 100) / 100;
                    const newBaseValue = Math.max(0, category.baseValue - adjustment);
                    
                    categoryBriefings.push({
                      categoryName: category.name,
                      difference: -adjustment,
                      newBaseValue: newBaseValue
                    });
                    
                    return {
                      ...category,
                      baseValue: newBaseValue,
                      tokens: category.tokens.map(token => ({ ...token, spent: false })) // Reset tokens
                    };
                }
                return category;
              })
            }));
        }
      }

      // 2. Reset tokens for weekly categories and reset Fuel baseValue
      const resetModules = modulesToSave.map(module => ({
        ...module,
        categories: module.categories.map(category => {
          if (category.id === FUEL_CATEGORY_ID) {
            // Fuel: Reset baseValue to initial weekly allocation ($50)
            // DO NOT reset spent tokens (they track the 4-week spend)
            return {
              ...category,
              baseValue: initialFuelBaseValue, 
              // Tokens remain as they are (spent status preserved)
            };
          }
          
          if (category.id !== GENERIC_CATEGORY_ID) {
            // Standard weekly category reset: reset tokens to unspent
            return {
              ...category,
              tokens: category.tokens.map(token => ({ ...token, spent: false }))
            };
          }
          
          // Generic category: tokens remain spent, baseValue remains accumulated
          return category;
        })
      }));

      await saveMutation.mutateAsync({ modules: resetModules, gearTravelFund: newFund });

      toast.success('Weekly reset complete!');
      queryClient.invalidateQueries({ queryKey: ['budgetState', userId] });
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });

      // Set briefing data to show the dialog
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

  const resetToInitialBudgets = useCallback(async () => {
    try {
      // Reset to the exact initial budgets from budgetData.ts
      await saveMutation.mutateAsync({ modules: initialModules, gearTravelFund: 0 });
      toast.success('Budget reset to initial values (all tokens unspent)');
      queryClient.invalidateQueries({ queryKey: ['budgetState', userId] });
      queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
    } catch (error) {
      console.error('Error in resetToInitialBudgets:', error);
      toast.error('Failed to reset budget');
    }
  }, [saveMutation, queryClient, userId]);

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
    totalSpent: totalSpentWeekly, // This is now the weekly total (excluding Fuel)
    spentToday,
    isLoading,
    isError,
    handleTokenSpend,
    handleCustomSpend,
    handleGenericSpend,
    handleFundAdjustment,
    handleMondayReset,
    resetToInitialBudgets,
    handleFullReset,
    refetchSpentToday,
    resetBriefing: briefingData,
    clearBriefing,
  };
};