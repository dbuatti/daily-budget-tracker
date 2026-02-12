"use client";

import React, { useEffect } from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import ModuleSection from '@/components/ModuleSection';
import QuickSpendButtons from '@/components/QuickSpendButtons';
import MondayBriefingDialog from '@/components/MondayBriefingDialog';
import RecentActivity from '@/components/RecentActivity';
import { Loader2 } from 'lucide-react';
import { GENERIC_MODULE_ID } from '@/data/budgetData';
import { formatCurrency } from '@/lib/format';
import { useUserProfile } from '@/hooks/useUserProfile';

const LogTransaction = () => {
  const { 
    modules, 
    transactions,
    isLoading, 
    handleTokenSpend, 
    resetBriefing, 
    clearBriefing, 
    spentToday, 
    totalSpent: totalSpentWeekly, 
    refetchSpentToday,
    deleteTransaction
  } = useBudgetState();
  
  const { profile } = useUserProfile();

  useEffect(() => {
    if (profile) {
      refetchSpentToday();
    }
  }, [profile, refetchSpentToday]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const visibleModules = modules.filter(module => module.id !== GENERIC_MODULE_ID);
  
  const totalBudget = modules.reduce((acc, module) => {
    return acc + module.categories.reduce((catAcc, cat) => catAcc + (cat.baseValue || 0), 0);
  }, 0);

  const weeklyProgress = totalBudget > 0 ? Math.min(100, (totalSpentWeekly / totalBudget) * 100) : 0;
  const weeklyRemaining = totalBudget - totalSpentWeekly;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-indigo-900 dark:text-indigo-200">
        Log Transaction
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <div className="p-6 bg-indigo-600 dark:bg-indigo-800 rounded-2xl shadow-2xl text-white text-center">
            <p className="text-sm font-medium opacity-80 uppercase tracking-wider">
              Today's Spend
            </p>
            <p className="text-5xl font-extrabold mt-2">
              {formatCurrency(spentToday).replace('A$', '$')}
            </p>
          </div>
          
          <QuickSpendButtons />

          <RecentActivity 
            transactions={transactions} 
            modules={modules} 
            onDelete={deleteTransaction} 
          />
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl shadow-xl border-2 border-indigo-300 dark:border-indigo-700 text-center">
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Weekly Token Budget Used
            </p>
            <p className="text-5xl font-extrabold mt-2 text-indigo-900 dark:text-white">
              {formatCurrency(totalSpentWeekly).replace('A$', '$')}
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
              out of {formatCurrency(totalBudget).replace('A$', '$')} token budget
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Weekly Token Progress</h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-400">
                  {Math.round(weeklyProgress)}% Used
                </span>
                <span className="text-xs font-semibold inline-block text-gray-600 dark:text-gray-400">
                  {formatCurrency(weeklyRemaining).replace('A$', '$')} remaining
                </span>
              </div>
              <div className="overflow-hidden h-3 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-800">
                <div 
                  style={{ width: `${weeklyProgress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {visibleModules.map((module) => (
          <ModuleSection
            key={module.id}
            module={module}
            onTokenSpend={handleTokenSpend}
          />
        ))}
      </div>

      {resetBriefing && (
        <MondayBriefingDialog
          isOpen={!!resetBriefing}
          onClose={clearBriefing}
          {...resetBriefing}
        />
      )}
    </div>
  );
};

export default LogTransaction;