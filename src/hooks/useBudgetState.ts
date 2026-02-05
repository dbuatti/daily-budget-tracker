import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { initialModules, WEEKLY_BUDGET_TOTAL, TOTAL_TOKEN_BUDGET, GENERIC_MODULE_ID, GENERIC_CATEGORY_ID } from '@/data/budgetData';
import { Module, Token } from '@/types/budget';
import { WeeklyBudgetState } from '@/types/supabase';
import { showSuccess, showError } from '@/utils/toast';
import { formatCurrency } from '@/lib/format';
import { isToday, parseISO, isBefore, startOfWeek, isSameDay } from 'date-fns';

const TABLE_NAME = 'weekly_budget_state';

// Helper to determine if a weekly reset is due (assuming week starts on Monday)
const isResetDue = (lastResetDate: string): boolean => {
  const lastReset = parseISO(lastResetDate);
  const today = new Date();
  
  // Define the start of the current week (Monday, weekStartsOn: 1)
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); 

  // A reset is due if the last reset date was before the start of the current week.
  return isBefore(lastReset, startOfCurrentWeek);
};

const fetchBudgetState = async (userId: string): Promise<WeeklyBudgetState | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means "No rows found"
    // If we get an error other than "No rows found", we throw it.
    throw new Error(error.message);
  }
  
  if (data) {
    // Ensure types are correct when returning
    return {
      ...data,
      current_tokens: data.current_tokens as Module[],
      gear_travel_fund: parseFloat(data.gear_travel_fund as string),
    } as WeeklyBudgetState;
  }
  return null;
};

const upsertBudgetState = async (state: Partial<WeeklyBudgetState> & { user_id: string }) => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(state, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message);
  }
};

export const useBudgetState = () => {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Fetch initial state
  const { data: dbState, isLoading, isError } = useQuery({
    queryKey: [TABLE_NAME, userId],
    queryFn: () => fetchBudgetState(userId!),
    enabled: !!userId,
    // Prevent retries on 404 errors which indicate missing table/endpoint
    retry: (failureCount, error) => {
      // Check if error message indicates a 404 or missing table (Supabase error messages can be vague)
      // We will allow retries up to 3 times unless it's a persistent error.
      if (failureCount >= 3) return false;
      return true;
    }
  });

  // Local state management
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [gearTravelFund, setGearTravelFund] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Mutation for saving state changes
  const saveMutation = useMutation({
    mutationFn: upsertBudgetState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE_NAME, userId] });
    },
    onError: (error) => {
      showError(`Failed to save state: ${error.message}`);
    }
  });

  // Function to perform the weekly reset logic
  const triggerWeeklyReset = useCallback((currentModules: Module[], currentFund: number) => {
    if (!userId) return;

    // Calculate total spent based on the provided modules (which should be the old state)
    const totalSpentInOldWeek = currentModules.reduce((moduleAcc, module) => {
      return moduleAcc + module.categories.reduce((catAcc, category) => {
        return catAcc + category.tokens.filter(t => t.spent).reduce((tokenAcc, token) => tokenAcc + token.value, 0);
      }, 0);
    }, 0);

    // Calculate remaining budget based on the ACTIVE TOKEN BUDGET
    const remainingActiveBudget = TOTAL_TOKEN_BUDGET - totalSpentInOldWeek;
    
    let newGearTravelFund = currentFund;

    if (remainingActiveBudget > 0) {
      const surplus = remainingActiveBudget;
      newGearTravelFund += surplus;
      showSuccess(`Weekly surplus of ${formatCurrency(surplus)} swept to Gear/Travel Fund!`);
    } else if (remainingActiveBudget < 0) {
      const deficit = Math.abs(remainingActiveBudget);
      showError(`Overspent active budget by ${formatCurrency(deficit)}. This deficit would be subtracted from next week's budget.`);
    } else {
        showSuccess("Active budget perfectly balanced. No surplus or deficit.");
    }

    // Reset tokens to initial state
    const resetModules = initialModules;
    setModules(resetModules);
    setGearTravelFund(newGearTravelFund);

    // Save the reset state to the database
    saveMutation.mutate({
      user_id: userId,
      current_tokens: resetModules,
      gear_travel_fund: newGearTravelFund,
      last_reset_date: new Date().toISOString().split('T')[0],
    });
  }, [userId, saveMutation]);


  // Initialize state from DB or defaults, and check for automatic reset
  useEffect(() => {
    // Only proceed if not loading and we have a user ID
    if (isLoading || !userId || isInitialized) return;

    if (isError) {
      setModules(initialModules);
      setGearTravelFund(0);
      setIsInitialized(true);
      showError("Could not connect to budget database. Functionality may be limited.");
      return;
    }

    const todayISO = new Date().toISOString().split('T')[0];
    let loadedModules = initialModules;
    let loadedFund = 0;
    let loadedLastResetDate = todayISO;

    if (dbState) {
      // Load state from DB
      loadedFund = dbState.gear_travel_fund;
      loadedModules = dbState.current_tokens;
      loadedLastResetDate = dbState.last_reset_date;
      
      setGearTravelFund(loadedFund);
      setModules(loadedModules);

      // Check for automatic weekly reset
      if (isResetDue(loadedLastResetDate)) {
        // Trigger the reset using the loaded data
        triggerWeeklyReset(loadedModules, loadedFund);
      }
    } else {
      // If no state exists (PGRST116), initialize with defaults and save
      setModules(initialModules);
      setGearTravelFund(0);
      
      saveMutation.mutate({
        user_id: userId,
        current_tokens: initialModules,
        gear_travel_fund: 0.00,
        last_reset_date: todayISO,
      });
    }
    
    setIsInitialized(true);
  }, [dbState, isLoading, userId, isInitialized, isError, saveMutation, triggerWeeklyReset]);

  const totalSpent = useMemo(() => {
    return modules.reduce((moduleAcc, module) => {
      return moduleAcc + module.categories.reduce((catAcc, category) => {
        return catAcc + category.tokens.filter(t => t.spent).reduce((tokenAcc, token) => tokenAcc + token.value, 0);
      }, 0);
    }, 0);
  }, [modules]);

  const handleTokenSpend = useCallback((categoryId: string, tokenId: string) => {
    if (!userId) return;

    let spentValue = 0;
    
    const newModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            tokens: category.tokens.map(token => {
              if (token.id === tokenId && !token.spent) {
                spentValue = token.value;
                return { ...token, spent: true };
              }
              return token;
            }),
          };
        }
        return category;
      }),
    }));

    if (spentValue > 0) {
      setModules(newModules);
      showSuccess(`Spent ${formatCurrency(spentValue)} on ${newModules.find(m => m.categories.some(c => c.id === categoryId))?.categories.find(c => c.id === categoryId)?.name}.`);
      
      // Save the new state to the database
      saveMutation.mutate({
        user_id: userId,
        current_tokens: newModules,
      });
    }
  }, [modules, userId, saveMutation]);

  const handleCustomSpend = useCallback((categoryId: string, amount: number) => {
    if (!userId || amount <= 0) return;

    const newSpentToken: Token = {
      id: `custom-${categoryId}-${Date.now()}-${Math.random()}`,
      value: amount,
      spent: true,
    };

    const newModules = modules.map(module => ({
      ...module,
      categories: module.categories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            // Add the new token to the category's token list
            tokens: [...category.tokens, newSpentToken],
          };
        }
        return category;
      }),
    }));

    setModules(newModules);
    
    const categoryName = newModules.find(m => m.categories.some(c => c.id === categoryId))
                                   ?.categories.find(c => c.id === categoryId)?.name || 'Unknown Category';

    showSuccess(`Logged custom spend of ${formatCurrency(amount)} in ${categoryName}.`);

    // Save the new state to the database
    saveMutation.mutate({
      user_id: userId,
      current_tokens: newModules,
    });

  }, [modules, userId, saveMutation]);

  const handleGenericSpend = useCallback((amount: number) => {
    if (!userId) return;

    const newSpentToken: Token = {
      id: `generic-${Date.now()}-${Math.random()}`,
      value: amount,
      spent: true,
    };

    let newModules: Module[];
    
    // Find the generic module/category or create it if it doesn't exist
    const genericModuleIndex = modules.findIndex(m => m.id === GENERIC_MODULE_ID);

    if (genericModuleIndex !== -1) {
      // Module exists, find category
      const genericCategoryIndex = modules[genericModuleIndex].categories.findIndex(c => c.id === GENERIC_CATEGORY_ID);
      
      if (genericCategoryIndex !== -1) {
        // Category exists, add new token
        newModules = modules.map((module, mIdx) => {
          if (mIdx === genericModuleIndex) {
            return {
              ...module,
              categories: module.categories.map((category, cIdx) => {
                if (cIdx === genericCategoryIndex) {
                  return {
                    ...category,
                    tokens: [...category.tokens, newSpentToken],
                  };
                }
                return category;
              }),
            };
          }
          return module;
        });
      } else {
        // Module exists, but category doesn't (shouldn't happen if initialized correctly, but safe guard)
        newModules = modules.map((module, mIdx) => {
          if (mIdx === genericModuleIndex) {
            return {
              ...module,
              categories: [...module.categories, {
                id: GENERIC_CATEGORY_ID,
                name: "Generic Spend",
                tokens: [newSpentToken],
              }],
            };
          }
          return module;
        });
      }
    } else {
      // Neither module nor category exists, create the whole structure and prepend it
      const genericModule: Module = {
        id: GENERIC_MODULE_ID,
        name: "Generic Spend (Hidden)",
        categories: [{
          id: GENERIC_CATEGORY_ID,
          name: "Generic Spend",
          tokens: [newSpentToken],
        }],
      };
      newModules = [genericModule, ...modules];
    }

    setModules(newModules);
    showSuccess(`Logged generic spend of ${formatCurrency(amount)}.`);

    // Save the new state to the database
    saveMutation.mutate({
      user_id: userId,
      current_tokens: newModules,
    });

  }, [modules, userId, saveMutation]);


  // Expose the manual reset function, now using the internal logic
  const handleMondayReset = useCallback(() => {
    // Use current local state for reset calculation
    triggerWeeklyReset(modules, gearTravelFund);
  }, [modules, gearTravelFund, triggerWeeklyReset]);

  const handleFundAdjustment = useCallback((newFundValue: number) => {
    if (!userId) return;

    setGearTravelFund(newFundValue);
    showSuccess(`Gear/Travel Fund manually set to ${formatCurrency(newFundValue)}.`);

    saveMutation.mutate({
      user_id: userId,
      gear_travel_fund: newFundValue,
    });
  }, [userId, saveMutation]);

  return {
    modules,
    gearTravelFund,
    totalSpent,
    isLoading: isLoading || saveMutation.isPending || !isInitialized,
    isError,
    handleTokenSpend,
    handleGenericSpend,
    handleCustomSpend,
    handleMondayReset,
    handleFundAdjustment,
  };
};