import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { initialModules, WEEKLY_BUDGET_TOTAL, TOTAL_TOKEN_BUDGET, GENERIC_MODULE_ID, GENERIC_CATEGORY_ID } from '@/data/budgetData';
import { Module, Token, Category } from '@/types/budget';
import { WeeklyBudgetState } from '@/types/supabase';
import { showSuccess, showError } from '@/utils/toast';
import { formatCurrency } from '@/lib/format';
import { isBefore, startOfWeek } from 'date-fns';

const TABLE_NAME = 'weekly_budget_state';

// --- Briefing Types ---
interface BriefingItem {
  categoryName: string;
  difference: number; // Positive for surplus, Negative for deficit
  newBaseValue?: number;
}

interface ResetBriefing {
  totalSpent: number;
  totalBudget: number;
  totalSurplus: number;
  totalDeficit: number;
  newGearTravelFund: number;
  categoryBriefings: BriefingItem[];
}
// ----------------------

// Helper to deeply parse token values from JSONB structure retrieved from Supabase
const parseModules = (modulesData: any): Module[] => {
    if (!Array.isArray(modulesData)) return initialModules;

    return modulesData.map((module: any) => ({
        ...module,
        categories: module.categories.map((category: any) => ({
            ...category,
            baseValue: parseFloat(category.baseValue) || 0, // Ensure baseValue is a number
            tokens: category.tokens.map((token: any) => ({
                ...token,
                value: parseFloat(token.value) || 0, // Ensure token value is a number
            })),
        })),
    }));
};


// Helper to determine if a weekly reset is due (assuming week starts on Monday)
const isResetDue = (lastResetDate: string): boolean => {
  const lastReset = new Date(lastResetDate);
  const today = new Date();
  
  // Define the start of the current week (Monday, weekStartsOn: 1)
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); 

  // We compare the start of the week of the last reset date vs the start of the current week.
  const startOfLastResetWeek = startOfWeek(lastReset, { weekStartsOn: 1 });

  return isBefore(startOfLastResetWeek, startOfCurrentWeek);
};

const fetchBudgetState = async (userId: string): Promise<WeeklyBudgetState | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means "No rows found"
    throw new Error(error.message);
  }
  
  if (data) {
    return {
      ...data,
      current_tokens: parseModules(data.current_tokens), // Use parser here
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

// Helper to calculate total spent in a category
const calculateCategorySpent = (category: Category): number => {
    return category.tokens
        .filter(t => t.spent)
        .reduce((sum, token) => sum + token.value, 0);
};

// Helper to generate a new set of tokens for a category based on a new base value
const generateNewTokens = (categoryId: string, newBaseValue: number): Token[] => {
    // For simplicity, we will generate a single token representing the new base value.
    if (newBaseValue <= 0) {
        return [{ id: `${categoryId}-0`, value: 0, spent: false }];
    }
    
    // Find the initial token values for this category to try and maintain structure
    const initialModule = initialModules.find(m => m.categories.some(c => c.id === categoryId));
    const initialCategory = initialModule?.categories.find(c => c.id === categoryId);

    if (initialCategory && initialCategory.tokens.length > 0) {
        // If the new base value matches the original base value, return the original tokens
        if (newBaseValue === initialCategory.baseValue) {
            return initialCategory.tokens.map(t => ({ ...t, spent: false }));
        }
        
        // If the new base value is different, we simplify it to one token for the adjusted amount
        return [{ id: `${categoryId}-0`, value: newBaseValue, spent: false }];
    }

    // Fallback for categories not found or generic ones
    return [{ id: `${categoryId}-0`, value: newBaseValue, spent: false }];
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
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      return true;
    }
  });

  // Local state management
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [gearTravelFund, setGearTravelFund] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [resetBriefing, setResetBriefing] = useState<ResetBriefing | null>(null);


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

  // Function to perform the weekly reset logic (Asymmetric Rollover)
  const triggerWeeklyReset = useCallback((oldModules: Module[], currentFund: number, isManual: boolean = false) => {
    if (!userId) return;

    let newGearTravelFund = currentFund;
    let totalSurplus = 0;
    let totalDeficit = 0;
    let totalSpentInOldWeek = 0;
    
    const categoryBriefings: BriefingItem[] = [];

    const resetModules: Module[] = initialModules.map(module => ({
        ...module,
        categories: module.categories.map(initialCategory => {
            // 1. Find the corresponding category in the old state
            const oldCategory = oldModules
                .flatMap(m => m.categories)
                .find(c => c.id === initialCategory.id);

            // If the category didn't exist in the old state (e.g., generic spend), use initial state
            if (!oldCategory) {
                return initialCategory;
            }

            // 2. Calculate spent vs base value
            const spent = calculateCategorySpent(oldCategory);
            totalSpentInOldWeek += spent;
            
            const baseValue = initialCategory.baseValue; // Use the base value from initialModules
            const difference = baseValue - spent; // Positive = surplus, Negative = deficit

            let newCategory: Category = { ...initialCategory };

            if (difference > 0) {
                // Underspent (Surplus) - Vaulting Method
                totalSurplus += difference;
                // Next week's budget remains the base value (initialCategory)
                newCategory = initialCategory;
                categoryBriefings.push({ categoryName: initialCategory.name, difference });
            } else if (difference < 0) {
                // Overspent (Deficit) - Asymmetric Rollover
                const deficit = Math.abs(difference);
                totalDeficit += deficit;
                
                // Calculate the new base value for next week
                const newBaseValue = Math.max(0, baseValue - deficit);
                
                // Create a new category structure with the adjusted tokens
                newCategory = {
                    ...initialCategory,
                    tokens: generateNewTokens(initialCategory.id, newBaseValue),
                };
                
                categoryBriefings.push({ categoryName: initialCategory.name, difference, newBaseValue });
            } else {
                // Perfectly balanced
                newCategory = initialCategory;
            }
            
            return newCategory;
        }),
    }));

    // Handle Generic Spend Module (ID: Z) - This module is purely tracking, no rollover logic needed.
    const genericModule = oldModules.find(m => m.id === GENERIC_MODULE_ID);
    if (genericModule) {
        totalSpentInOldWeek += genericModule.categories.reduce((acc, cat) => acc + calculateCategorySpent(cat), 0);
    }

    // Filter out the generic module from the new week's budget.
    const finalModules = resetModules.filter(m => m.id !== GENERIC_MODULE_ID);

    // Apply surplus to the Gear/Travel Fund
    if (totalSurplus > 0) {
      newGearTravelFund += totalSurplus;
      if (!isManual) {
        showSuccess(`Weekly surplus of ${formatCurrency(totalSurplus)} swept to Gear/Travel Fund!`);
      }
    }
    
    // Set the briefing state for the UI
    setResetBriefing({
        totalSpent: totalSpentInOldWeek,
        totalBudget: TOTAL_TOKEN_BUDGET,
        totalSurplus,
        totalDeficit,
        newGearTravelFund,
        categoryBriefings: categoryBriefings.filter(b => b.difference !== 0),
    });

    setModules(finalModules);
    setGearTravelFund(newGearTravelFund);

    // Save the reset state to the database
    saveMutation.mutate({
      user_id: userId,
      current_tokens: finalModules,
      gear_travel_fund: newGearTravelFund,
      last_reset_date: new Date().toISOString().split('T')[0],
    });
  }, [userId, saveMutation]);


  // Initialize state from DB or defaults, and check for automatic reset
  useEffect(() => {
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
        return catAcc + calculateCategorySpent(category);
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
                baseValue: 0, // Generic spend has no base budget
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
          baseValue: 0, // Generic spend has no base budget
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
    // Use current local state for reset calculation, explicitly marking as manual
    triggerWeeklyReset(modules, gearTravelFund, true);
  }, [modules, gearTravelFund, triggerWeeklyReset]);
  
  const handleFullReset = useCallback(() => {
    if (!userId) return;

    const todayISO = new Date().toISOString().split('T')[0];
    
    setModules(initialModules);
    setGearTravelFund(0);
    setResetBriefing(null); // Clear any pending briefing

    showSuccess("Budget fully reset to initial configuration.");

    // Save the reset state to the database
    saveMutation.mutate({
      user_id: userId,
      current_tokens: initialModules,
      gear_travel_fund: 0.00,
      last_reset_date: todayISO,
    });
  }, [userId, saveMutation]);

  const handleFundAdjustment = useCallback((newFundValue: number) => {
    if (!userId) return;

    setGearTravelFund(newFundValue);
    showSuccess(`Gear/Travel Fund manually set to ${formatCurrency(newFundValue)}.`);

    saveMutation.mutate({
      user_id: userId,
      gear_travel_fund: newFundValue,
    });
  }, [userId, saveMutation]);
  
  const clearBriefing = useCallback(() => {
    setResetBriefing(null);
  }, []);

  return {
    modules,
    gearTravelFund,
    totalSpent,
    isLoading: isLoading || saveMutation.isPending || !isInitialized,
    isError,
    resetBriefing,
    clearBriefing,
    handleTokenSpend,
    handleGenericSpend,
    handleCustomSpend,
    handleMondayReset,
    handleFundAdjustment,
    handleFullReset, // Export the new function
  };
};