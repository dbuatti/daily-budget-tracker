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
  
  const totalTokenValue = category.tokens.reduce((sum, token) => sum + token.value, 0);
  const initialWeeklyBudget = Math.max(category.baseValue || 0, totalTokenValue);

  const totalSpentInThisCategory = category.tokens
    .filter(t => t.spent)
    .reduce((sum, token) => sum + token.value, 0);

  let displayBudget = initialWeeklyBudget;
  let currentStatus = initialWeeklyBudget - totalSpentInThisCategory;
  let statusLabel = "Initial Budget";

  if (category.id === FUEL_CATEGORY_ID) {
    displayBudget = initialWeeklyBudget * 4;
    currentStatus = displayBudget - totalSpentInThisCategory;
    statusLabel = "4-Week Budget";
  }

  return (
    <Card className="rounded-2xl shadow-xl border-2 border-indigo-200 dark:border-indigo-800/70 bg-white dark:bg-gray-900/50">
      <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
        <CardTitle className="text-xl font-bold text-indigo-800 dark:text-indigo-300 flex justify-between items-center mb-1">
          <span>{category.name}</span>
          <span className={`text-lg font-extrabold ${currentStatus < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(currentStatus).replace('A$', '$')}
          </span>
        </CardTitle>
        <p className="text-xs text-gray-500">{statusLabel}: {formatCurrency(displayBudget).replace('A$', '$')}</p>
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