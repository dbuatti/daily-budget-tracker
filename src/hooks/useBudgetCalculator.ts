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
        const percentage = category.percentage || 0;
        totalPercentage += percentage;

        // 2. Percentage Allocation
        const targetValue = weeklyRawLimit * (percentage / 100);
        
        // 3. Round to nearest $5 (The "Tokenization" rule)
        const roundedValue = Math.round(targetValue / 5) * 5;
        
        // 4. Calculate "Dust" (The remainder strategy)
        const dust = targetValue - roundedValue;
        totalDust += dust;

        // 5. Automatic Denominations Logic
        // Small (< $30): $5 tokens
        // Mid ($30 - $100): $10 tokens
        // Large (> $100): $20 tokens
        let denom = 10;
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

        // Handle any remainder from denomination (should be multiple of 5)
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

    // 100% Check / Warning
    const isOverAllocated = totalPercentage > 100;

    return { 
      scaledModules, 
      totalDust, 
      weeklyRawLimit, 
      totalPercentage,
      isOverAllocated 
    };
  }, [annualIncome, modules, weeklyRawLimit]);

  return result;
};