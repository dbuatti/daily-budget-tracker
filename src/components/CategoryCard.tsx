import React from 'react';
import TokenButton from './TokenButton';
import { Category } from '@/types/budget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

interface CategoryCardProps {
  category: Category;
  onTokenSpend: (categoryId: string, tokenId: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onTokenSpend }) => {
  const totalCategoryBudget = category.tokens.reduce((sum, token) => sum + token.value, 0);
  const spentAmount = category.tokens.filter(t => t.spent).reduce((sum, token) => sum + token.value, 0);
  const remainingAmount = totalCategoryBudget - spentAmount;

  return (
    <Card className="rounded-2xl shadow-xl border-indigo-100 dark:border-indigo-900/50 transition-all hover:shadow-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-extrabold text-indigo-800 dark:text-indigo-300 flex justify-between items-center">
          <span>{category.name}</span>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {formatCurrency(remainingAmount)} left
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {category.tokens.map((token) => (
          <TokenButton
            key={token.id}
            value={token.value}
            spent={token.spent}
            onClick={() => onTokenSpend(category.id, token.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default CategoryCard;