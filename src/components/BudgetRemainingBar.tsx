import React from 'react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface BudgetRemainingBarProps {
  spent: number;
  total: number;
  className?: string;
}

const BudgetRemainingBar: React.FC<BudgetRemainingBarProps> = ({
  spent,
  total,
  className,
}) => {
  const remaining = total - spent;
  const percent = total > 0 ? ((remaining / total) * 100) : 0;
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <div className={cn(
      'bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden',
      className
    )}>
      <div
        className="h-2 bg-green-500 dark:bg-green-400 transition-all"
        style={{ width: `${safePercent}%` }}
      />
      <div className="flex items-center px-2 py-1 text-xs font-medium text-gray-800 dark:text-gray-200">
        Remaining: <span className="font-semibold">{formatCurrency(remaining)}</span>
      </div>
    </div>
  );
};

export default BudgetRemainingBar;