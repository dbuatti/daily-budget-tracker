"use client";

import React from 'react';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StyledProgress from '@/components/StyledProgress';
import { DollarSign, TrendingUp, Wallet, Calendar } from 'lucide-react';
import { Module } from '@/types/budget';
import { differenceInDays, nextMonday, startOfDay } from 'date-fns';

interface DashboardHeaderProps {
  totalSpent: number;
  gearTravelFund: number;
  modules: Module[];
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ totalSpent, gearTravelFund, modules }) => {
  const totalBudget = modules.reduce((acc, module) => {
    return acc + module.categories.reduce((catAcc, cat) => catAcc + (cat.baseValue || 0), 0);
  }, 0);

  const remainingBudget = totalBudget - totalSpent;
  const deficit = Math.max(0, -remainingBudget);
  
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const progressValue = Math.min(100, spentPercentage);

  const savingsGoal = 500; 
  const savingsProgress = Math.min(100, (gearTravelFund / savingsGoal) * 100);

  const daysUntilReset = differenceInDays(nextMonday(new Date()), startOfDay(new Date()));

  const getStatusText = () => {
    if (deficit > 0) {
      return `Overspent: ${formatCurrency(deficit).replace('A$', '$')}`;
    }
    return `Remaining: ${formatCurrency(remainingBudget).replace('A$', '$')}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      
      <Card className="rounded-2xl shadow-2xl border-4 border-indigo-300 dark:border-indigo-700 bg-indigo-100/70 dark:bg-indigo-900/70 transition-transform hover:scale-[1.01]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
            Weekly Budget
          </CardTitle>
          <Wallet className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-extrabold text-indigo-900 dark:text-white">
            {formatCurrency(totalBudget).replace('A$', '$')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-bold">
            <Calendar className="w-3.5 h-3.5" />
            {daysUntilReset} days until reset
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-2xl border-4 border-gray-300 dark:border-gray-700 bg-white dark:bg-card transition-transform hover:scale-[1.01]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Current Status
          </CardTitle>
          <DollarSign className="h-6 w-6 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className={
            `text-3xl font-extrabold ${deficit > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`
          }>
            {getStatusText()}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Spent: {formatCurrency(totalSpent).replace('A$', '$')} / {formatCurrency(totalBudget).replace('A$', '$')}
          </p>
          <StyledProgress 
            value={progressValue} 
            className="mt-3 h-3 bg-gray-200 dark:bg-gray-800" 
            indicatorClassName={deficit > 0 ? "bg-red-500 shadow-lg shadow-red-400/70" : "bg-green-500 shadow-lg shadow-green-400/70"}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-2xl border-4 border-yellow-300 dark:border-yellow-700 bg-yellow-100/70 dark:bg-yellow-900/70 transition-transform hover:scale-[1.01]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-yellow-800 dark:text-yellow-300">
            Gear/Travel Fund
          </CardTitle>
          <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-extrabold text-yellow-900 dark:text-white">
            {formatCurrency(gearTravelFund).replace('A$', '$')}
          </div>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Savings Progress (Goal: {formatCurrency(savingsGoal).replace('A$', '$')})
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