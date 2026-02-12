import { useMemo } from 'react';
import { Category, Token, Module } from '@/types/budget';

const WEEKS_IN_YEAR = 52.17;

/**
 * Scaling Engine Hook
 * Converts annual income into a weekly disposable pool and distributes it across categories.
 */
export const useBudgetCalculator = (annualIncome: number, modules: Module[]) => {
  // 1. Calculate Weekly Total Pool
  const weeklyRawLimit = annualIncome / WEEKS_IN_YEAR;

  const result = useMemo(() => {
    let totalDust = 0;
    let totalPercentage = 0;

    const scaledModules = modules.map((module) => {
      const scaledCategories = module.categories.map((category) => {
        let targetValue = 0;

        // 2. Allocation Logic
        if (category.frequency === 'monthly') {
          // Monthly Spread: Divide total monthly amount by 4
          targetValue = (category.totalMonthlyAmount || 0) / 4;
        } else if (category.mode === 'percentage') {
          // Percentage Allocation
          const percentage = category.percentage || 0;
          totalPercentage += percentage;
          targetValue = weeklyRawLimit * (percentage / 100);
        } else {
          // Fixed Weekly Amount
          targetValue = category.baseValue || 0;
        }
        
        // 3. Round to nearest $5 (The "Tokenization" rule)
        const roundedValue = Math.round(targetValue / 5) * 5;
        
        // 4. Calculate "Dust" (The remainder strategy)
        const dust = targetValue - roundedValue;
        totalDust += dust;

        // 5. Automatic Denominations Logic
        let denom = category.tokenValue || 10;
        if (roundedValue < 30) {
          denom = 5;
        } else if (roundedValue >= 100) {
          denom = 20;
        }

        // 6. Token Generator
        const tokens: Token[] = [];
        let remaining = roundedValue;
        let count = 0;

        while (remaining >= denom) {
          tokens.push({
            id: `${category.id}-${count++}`,
            value: denom,
            spent: false,
          });
          remaining -= denom;
        }

        if (remaining > 0) {
          tokens.push({
            id: `${category.id}-${count++}`,
            value: remaining,
            spent: false,
          });
        }

        return {
          ...category,
          baseValue: roundedValue,
          tokens,
        };
      });

      return {
        ...module,
        categories: scaledCategories,
      };
    });

    const totalWeeklyAllocated = scaledModules.reduce((sum, m) => 
      sum + m.categories.reduce((cs, c) => cs + c.baseValue, 0)
    , 0);

    const isOverAllocated = totalWeeklyAllocated > weeklyRawLimit;

    return { 
      scaledModules, 
      totalDust, 
      weeklyRawLimit, 
      totalPercentage,
      totalWeeklyAllocated,
      isOverAllocated 
    };
  }, [annualIncome, modules, weeklyRawLimit]);

  return result;
};