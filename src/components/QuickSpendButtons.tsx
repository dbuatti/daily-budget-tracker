import React from 'react';
import { Button } from '@/components/ui/button';
import { useBudgetState } from '@/hooks/useBudgetState';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const quickAmounts = [5, 10, 15, 20, 25, 30];

const QuickSpendButtons: React.FC = () => {
  const { handleGenericSpend, totalSpent } = useBudgetState();
  
  // TOTAL_TOKEN_BUDGET is 382.00 based on budgetData.ts
  const TOTAL_TOKEN_BUDGET = 382.00; 
  const remainingActiveBudget = TOTAL_TOKEN_BUDGET - totalSpent;

  const handleSpend = (amount: number) => {
    handleGenericSpend(amount);
  };

  return (
    <div className="mb-8 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
      <h2 className="text-xl font-extrabold text-indigo-800 dark:text-indigo-300 mb-4 text-center">
        Quick Log (Generic Spend)
      </h2>
      <div className="flex flex-wrap justify-center gap-3">
        {quickAmounts.map((amount) => {
          const isOverBudget = amount > remainingActiveBudget;
          
          return (
            <Button
              key={amount}
              onClick={() => handleSpend(amount)}
              className={cn(
                "h-14 w-20 rounded-xl font-extrabold text-lg transition-all duration-200 shadow-lg active:scale-[0.95]",
                isOverBudget
                  ? "bg-red-600 text-white hover:bg-red-700 border-2 border-red-700 shadow-red-400/50"
                  : "bg-green-600 text-white hover:bg-green-700 border-2 border-green-700 shadow-green-400/50",
                "dark:shadow-none dark:border-2",
                isOverBudget && "dark:bg-red-800 dark:hover:bg-red-700 dark:border-red-600",
                !isOverBudget && "dark:bg-green-800 dark:hover:bg-green-700 dark:border-green-600"
              )}
            >
              {formatCurrency(amount).replace('A$', '$')}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickSpendButtons;