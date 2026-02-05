import React from 'react';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StyledProgress from '@/components/StyledProgress';
import { WEEKLY_BUDGET_TOTAL, TOTAL_TOKEN_BUDGET } from '@/data/budgetData';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';

interface DashboardHeaderProps {
  totalSpent: number;
  gearTravelFund: number;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ totalSpent, gearTravelFund }) => {
  const remainingBudget = WEEKLY_BUDGET_TOTAL - totalSpent;
  const deficit = Math.max(0, -remainingBudget);
  
  // Calculate progress for the token budget (382.00)
  const spentPercentage = (totalSpent / TOTAL_TOKEN_BUDGET) * 100;
  const progressValue = Math.min(100, spentPercentage);

  const savingsGoal = 500; // Example goal for the fund
  const savingsProgress = Math.min(100, (gearTravelFund / savingsGoal) * 100);

  const getStatusText = () => {
    if (deficit > 0) {
      return `Overspent: ${formatCurrency(deficit)}`;
    }
    return `Remaining: ${formatCurrency(remainingBudget)}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      
      {/* Total Weekly Budget Card - Enhanced Indigo */}
      <Card className="rounded-2xl shadow-2xl border-4 border-indigo-300 dark:border-indigo-700 bg-indigo-100/70 dark:bg-indigo-900/70 transition-transform hover:scale-[1.01]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
            Weekly Budget
          </CardTitle>
          <Wallet className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-extrabold text-indigo-900 dark:text-white">
            {formatCurrency(WEEKLY_BUDGET_TOTAL)}
          </div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
            Total available for the week
          </p>
        </CardContent>
      </Card>

      {/* Spent/Remaining Status Card - Enhanced Status */}
      <Card className="rounded-2xl shadow-2xl border-4 border-gray-300 dark:border-gray-700 bg-white dark:bg-card transition-transform hover:scale-[1.01]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Current Status
          </CardTitle>
          <DollarSign className="h-6 w-6 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className={
            `text-4xl font-extrabold ${deficit > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`
          }>
            {getStatusText()}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Spent: {formatCurrency(totalSpent)} / {formatCurrency(TOTAL_TOKEN_BUDGET)}
          </p>
          <StyledProgress 
            value={progressValue} 
            className="mt-3 h-3 bg-gray-200 dark:bg-gray-800" 
            indicatorClassName={deficit > 0 ? "bg-red-500 shadow-lg shadow-red-400/70" : "bg-green-500 shadow-lg shadow-green-400/70"}
          />
        </CardContent>
      </Card>

      {/* Gear/Travel Fund Card - Enhanced Yellow */}
      <Card className="rounded-2xl shadow-2xl border-4 border-yellow-300 dark:border-yellow-700 bg-yellow-100/70 dark:bg-yellow-900/70 transition-transform hover:scale-[1.01]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-yellow-800 dark:text-yellow-300">
            Gear/Travel Fund
          </CardTitle>
          <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-extrabold text-yellow-900 dark:text-white">
            {formatCurrency(gearTravelFund)}
          </div>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Savings Progress (Goal: {formatCurrency(savingsGoal)})
          </p>
          <StyledProgress 
            value={savingsProgress} 
            className="mt-3 h-3 bg-yellow-200 dark:bg-yellow-800" 
            indicatorClassName="bg-yellow-500 shadow-lg shadow-yellow-400/70"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHeader;