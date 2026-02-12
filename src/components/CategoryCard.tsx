import React from 'react';
import TokenButton from './TokenButton';
import { Category } from '@/types/budget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import AddTokenDialog from './AddTokenDialog';
import { useBudgetState } from '@/hooks/useBudgetState';
import { FUEL_CATEGORY_ID } from '@/data/budgetData';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: Category;
  onTokenSpend: (categoryId: string, tokenId: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onTokenSpend }) => {
  const { handleCustomSpend } = useBudgetState();
  
  // The "Initial Budget" is the static baseValue from settings
  const initialWeeklyBudget = category.baseValue || 0;

  // Calculate total spent in this category from the tokens (which are derived from transactions)
  const totalSpentInThisCategory = category.tokens
    .filter(t => t.spent)
    .reduce((sum, token) => sum + token.value, 0);

  let displayInitialBudget = initialWeeklyBudget;
  let statusLabel = "Weekly Budget";

  // Special handling for Fuel (4-week cycle)
  if (category.id === FUEL_CATEGORY_ID) {
    displayInitialBudget = initialWeeklyBudget * 4;
    statusLabel = "4-Week Budget";
  }

  const remainingBalance = displayInitialBudget - totalSpentInThisCategory;
  const isOverspent = remainingBalance < 0;

  return (
    <Card className={cn(
      "rounded-2xl shadow-xl border-2 transition-all duration-300",
      isOverspent 
        ? "border-red-300 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10" 
        : "border-indigo-200 dark:border-indigo-800/70 bg-white dark:bg-gray-900/50"
    )}>
      <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
        <CardTitle className="text-xl font-bold text-indigo-800 dark:text-indigo-300 flex justify-between items-center mb-1">
          <span>{category.name}</span>
          <div className="text-right">
            <span className={cn(
              "text-2xl font-black block",
              isOverspent ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            )}>
              {formatCurrency(remainingBalance).replace('A$', '$')}
            </span>
            <span className="text-[10px] uppercase tracking-tighter text-gray-400 font-bold">
              Remaining
            </span>
          </div>
        </CardTitle>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500">
            {statusLabel}: <span className="font-semibold">{formatCurrency(displayInitialBudget).replace('A$', '$')}</span>
          </p>
          <p className="text-xs text-gray-500">
            Spent: <span className="font-semibold">{formatCurrency(totalSpentInThisCategory).replace('A$', '$')}</span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 p-4">
        {category.tokens.length > 0 ? (
          category.tokens.map((token) => (
            <TokenButton
              key={token.id}
              value={token.value}
              spent={token.spent}
              onClick={() => onTokenSpend(category.id, token.id)}
            />
          ))
        ) : (
          <p className="text-sm text-gray-400 italic">No tokens available.</p>
        )}
      </CardContent>
      <div className="p-4 pt-0 border-t border-indigo-100 dark:border-indigo-900/50">
        <AddTokenDialog 
          categoryId={category.id}
          categoryName={category.name}
          onAddToken={handleCustomSpend}
        />
      </div>
    </Card>
  );
};

export default CategoryCard;