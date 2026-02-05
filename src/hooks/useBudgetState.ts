import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { initialModules, WEEKLY_BUDGET_TOTAL } from '@/data/budgetData';
import { Module } from '@/types/budget';
import { WeeklyBudgetState } from '@/types/supabase';
import { showSuccess, showError } from '@/utils/toast';
import { formatCurrency } from '@/lib/format';
import { isToday, parseISO } from 'date-fns';

const TABLE_NAME = 'weekly_budget_state';

// Helper to check if the last reset date was before today
const needsReset = (lastResetDate: string) => {
  const lastDate = parseISO(lastResetDate);
  // Check if the last reset was NOT today (assuming reset happens on Monday)
  // For simplicity in this demo, we'll just check if it's not today, 
  // but a real app would check if it's a new week/Monday.
  return !isToday(lastDate);
};

const fetchBudgetState = async (userId: string): Promise<WeeklyBudgetState | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means "No rows found"
    // If we get an error other than "No rows found", we throw it.
    // This includes the 404 error if the table is not exposed.
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

  // Initialize state from DB or defaults
  useEffect(() => {
    // Only proceed if not loading and we have a user ID
    if (isLoading || !userId || isInitialized) return;

    if (isError) {
      // If there was an error fetching (e.g., 404 because table is not exposed yet), 
      // we initialize locally but DO NOT attempt to save, preventing repeated 404 POST requests.
      setModules(initialModules);
      setGearTravelFund(0);
      setIsInitialized(true);
      showError("Could not connect to budget database. Functionality may be limited.");
      return;
    }

    if (dbState) {
      // Load state from DB
      setGearTravelFund(dbState.gear_travel_fund);
      setModules(dbState.current_tokens);
      setIsInitialized(true);
    } else {
      // If no state exists (PGRST116), initialize with defaults and save
      setModules(initialModules);
      setGearTravelFund(0);
      setIsInitialized(true);
      saveMutation.mutate({
        user_id: userId,
        current_tokens: initialModules,
        gear_travel_fund: 0.00,
        last_reset_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [dbState, isLoading, userId, isInitialized, isError, saveMutation]);

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

  const handleMondayReset = useCallback(() => {
    if (!userId) return;

    const remainingBudget = WEEKLY_BUDGET_TOTAL - totalSpent;
    
    let newGearTravelFund = gearTravelFund;

    if (remainingBudget > 0) {
      const surplus = remainingBudget;
      newGearTravelFund += surplus;
      showSuccess(`Weekly surplus of ${formatCurrency(surplus)} swept to Gear/Travel Fund!`);
    } else if (remainingBudget < 0) {
      const deficit = Math.abs(remainingBudget);
      showError(`Overspent by ${formatCurrency(deficit)}. This deficit would be subtracted from next week's budget.`);
      // NOTE: For V1, we don't implement deficit subtraction logic, just the notification.
    } else {
        showSuccess("Budget perfectly balanced. No surplus or deficit.");
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
  }, [totalSpent, gearTravelFund, userId, saveMutation]);

  return {
    modules,
    gearTravelFund,
    totalSpent,
    isLoading: isLoading || saveMutation.isPending || !isInitialized,
    isError,
    handleTokenSpend,
    handleMondayReset,
  };
};