import React from 'react';
import TokenButton from './TokenButton';
import { Category } from '@/types/budget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import AddTokenDialog from './AddTokenDialog';
import { useBudgetState } from '@/hooks/useBudgetState';

interface CategoryCardProps {
  category: Category;
  onTokenSpend: (categoryId: string, tokenId: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onTokenSpend }) => {
  const { handleCustomSpend } = useBudgetState();
  
  // 1. Calculate the initial budget (sum of predefined tokens)
  const initialBudget = category.tokens
    .filter(t => t.id.startsWith(category.id) && !t.id.startsWith('custom-'))
    .reduce((sum, token) => sum + token.value, 0);

  // 2. Calculate the total amount spent in this category (predefined tokens + custom spends)
  const totalSpentInThisCategory = category.tokens
    .filter(t => t.spent)
    .reduce((sum, token) => sum + token.value, 0);

  // 3. Calculate the current status (Remaining = Initial Budget - Total Spent)
  const currentStatus = initialBudget - totalSpentInThisCategory;

  return (
    <Card className="rounded-2xl shadow-xl border-2 border-indigo-200 dark:border-indigo-800/70 transition-all hover:shadow-2xl bg-white dark:bg-gray-900/50">
      <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
        <CardTitle className="text-xl font-bold text-indigo-800 dark:text-indigo-300 flex justify-between items-center">
          <span>{category.name}</span>
          <span className={
            `text-base font-extrabold ${currentStatus < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`
          }>
            {formatCurrency(currentStatus)}
          </span>
        </CardTitle>
        <p className="text-xs text-gray-500 dark:text-gray-400">
            Initial Budget: {formatCurrency(initialBudget)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 p-4 justify-start">
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