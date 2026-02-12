import React from 'react';
import TokenButton from './TokenButton';
import { Category } from '@/types/budget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import AddTokenDialog from './AddTokenDialog';
import { useBudgetState } from '@/hooks/useBudgetState';
import { FUEL_CATEGORY_ID } from '@/data/budgetData';

interface CategoryCardProps {
  category: Category;
  onTokenSpend: (categoryId: string, tokenId: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onTokenSpend }) => {
  const { handleCustomSpend } = useBudgetState();
  
  // The "Initial Budget" is the static baseValue from settings
  const initialWeeklyBudget = category.baseValue || 0;

  // Calculate total spent in this category from the tokens (which are now derived from transactions)
  const totalSpentInThisCategory = category.tokens
    .filter(t => t.spent)
    .reduce((sum, token) => sum + token.value, 0);

  let displayInitialBudget = initialWeeklyBudget;
  let statusLabel = "Initial Budget";

  // Special handling for Fuel (4-week cycle)
  if (category.id === FUEL_CATEGORY_ID) {
    displayInitialBudget = initialWeeklyBudget * 4;
    statusLabel = "4-Week Budget";
  }

  const currentStatus = displayInitialBudget - totalSpentInThisCategory;
  const isOverspent = currentStatus < 0;

  return (
    <Card className="rounded-2xl shadow-xl border-2 border-indigo-200 dark:border-indigo-800/70 bg-white dark:bg-gray-900/50">
      <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
        <CardTitle className="text-xl font-bold text-indigo-800 dark:text-indigo-300 flex justify-between items-center mb-1">
          <span>{category.name}</span>
          <span className={`text-lg font-extrabold ${isOverspent ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatCurrency(currentStatus).replace('A$', '$')}
          </span>
        </CardTitle>
        <p className="text-xs text-gray-500">
          {statusLabel}: <span className="font-semibold">{formatCurrency(displayInitialBudget).replace('A$', '$')}</span>
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 p-4">
        {category.tokens.map((token) => (
          <TokenButton
            key={token.id}
            value={token.value}
            spent={token.spent}
            onClick={() => onTokenSpend(category.id, token.id)}
          />
        ))}
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