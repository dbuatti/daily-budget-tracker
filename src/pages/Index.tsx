"use client";

import React, { useEffect } from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import ModuleSection from '@/components/ModuleSection';
import QuickSpendButtons from '@/components/QuickSpendButtons';
import MondayBriefingDialog from '@/components/MondayBriefingDialog';
import RecentActivity from '@/components/RecentActivity';
import { Loader2, Wallet, TrendingUp } from 'lucide-react';
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
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
          Log Transaction
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Track your spending and manage your weekly tokens.
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Actions & Stats */}
        <div className="lg:col-span-5 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none text-white">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Today's Spend</p>
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-4xl font-black">
                {formatCurrency(spentToday).replace('A$', '$')}
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Weekly Used</p>
                <Wallet className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-4xl font-black text-gray-900 dark:text-white">
                {Math.round(weeklyProgress)}%
              </p>
              <div className="mt-4 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500" 
                  style={{ width: `${weeklyProgress}%` }}
                />
              </div>
            </div>
          </div>
          
          <QuickSpendButtons />

          <RecentActivity 
            transactions={transactions} 
            modules={modules} 
            onDelete={deleteTransaction} 
          />
        </div>

        {/* Right Column: Category Modules */}
        <div className="lg:col-span-7 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Categories</h2>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(weeklyRemaining).replace('A$', '$')} remaining
            </p>
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
        </div>
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