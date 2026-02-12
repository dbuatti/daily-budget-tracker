import React from 'react';
import TokenButton from './TokenButton';
import { Category } from '@/types/budget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import AddTokenDialog from './AddTokenDialog';
import { useBudgetState } from '@/hooks/useBudgetState';
import { FUEL_CATEGORY_ID } from '@/data/budgetData';
import { Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CategoryCardProps {
  category: Category;
  onTokenSpend: (categoryId: string, tokenId: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onTokenSpend }) => {
  const { handleCustomSpend } = useBudgetState();
  
  // The base budget for the week
  const baseBudget = category.baseValue || 0;
  
  // Special handling for Fuel (4-week budget)
  const displayBudget = category.id === FUEL_CATEGORY_ID ? baseBudget * 4 : baseBudget;

  // Calculate total spent from all tokens (base + custom)
  const totalSpent = category.tokens
    .filter(t => t.spent)
    .reduce((sum, token) => sum + token.value, 0);

  // The true remaining balance
  const currentStatus = displayBudget - totalSpent;
  const statusLabel = category.id === FUEL_CATEGORY_ID ? "4-Week Budget" : "Initial Budget";

  return (
    <Card className="rounded-2xl shadow-xl border-2 border-indigo-200 dark:border-indigo-800/70 transition-all hover:shadow-2xl bg-white dark:bg-gray-900/50">
      <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
        <CardTitle className="text-xl font-bold text-indigo-800 dark:text-indigo-300 flex justify-between items-center mb-1">
          <div className="flex items-center">
            <span>{category.name}</span>
            {category.frequency === 'monthly' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Calendar className="w-4 h-4 ml-2 text-indigo-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>4-Week Spread: {formatCurrency(category.totalMonthlyAmount || 0)} / month</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <span className={
            `text-lg font-extrabold ${currentStatus < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`
          }>
            {formatCurrency(currentStatus).replace('A$', '$')}
          </span>
        </CardTitle>
        <p className="text-xs text-gray-500 dark:text-gray-400">
            {statusLabel}: {formatCurrency(displayBudget).replace('A$', '$')}
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