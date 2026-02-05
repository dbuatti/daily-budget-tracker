import React from 'react';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StyledProgress from '@/components/StyledProgress'; // Use StyledProgress instead of ui/progress
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
      
      {/* Total Weekly Budget Card */}
      <Card className="rounded-2xl shadow-xl bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            Weekly Budget
          </CardTitle>
          <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-indigo-900 dark:text-white">
            {formatCurrency(WEEKLY_BUDGET_TOTAL)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Total available for the week
          </p>
        </CardContent>
      </Card>

      {/* Spent/Remaining Status Card */}
      <Card className="rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Status
          </CardTitle>
          <DollarSign className="h-5 w-5 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className={
            `text-3xl font-bold ${deficit > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`
          }>
            {getStatusText()}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Spent: {formatCurrency(totalSpent)}
          </p>
          <StyledProgress 
            value={progressValue} 
            className="mt-3 h-2" 
            indicatorClassName={deficit > 0 ? "bg-red-500" : "bg-green-500"}
          />
        </CardContent>
      </Card>

      {/* Gear/Travel Fund Card */}
      <Card className="rounded-2xl shadow-xl bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Gear/Travel Fund
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-900 dark:text-white">
            {formatCurrency(gearTravelFund)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Savings Progress ({formatCurrency(savingsGoal)} goal)
          </p>
          <StyledProgress 
            value={savingsProgress} 
            className="mt-3 h-2" 
            indicatorClassName="bg-yellow-500"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHeader;