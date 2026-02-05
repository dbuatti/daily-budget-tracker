"use client";

import React from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import DashboardHeader from '@/components/DashboardHeader';
import DebugActions from '@/components/DebugActions';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ModuleSection from '@/components/ModuleSection';

const WeeklyDashboard: React.FC = () => {
  const { 
    modules, 
    gearTravelFund, 
    totalSpent, 
    isLoading, 
    isError,
    handleTokenSpend, 
    handleMondayReset,
    state // Get raw state
  } = useBudgetState();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (isError) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-red-500">Error loading budget data.</p></div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-indigo-900 dark:text-indigo-200">
        Weekly Permissions Dashboard
      </h1>

      <DashboardHeader 
        totalSpent={totalSpent} 
        gearTravelFund={gearTravelFund} 
      />

      <div className="flex justify-end items-center space-x-4 mb-6">
        <DebugActions />
        <Button 
          onClick={handleMondayReset} 
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg transition-transform active:scale-[0.98] font-semibold"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Simulate Monday Reset
        </Button>
      </div>

      {modules.length === 0 && (
        <Card className="mb-8 rounded-2xl shadow-xl border-2 border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/30">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-yellow-800 dark:text-yellow-300">
              ⚠️ No Categories Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-800 dark:text-yellow-200 mb-4">
              Your budget categories are missing. This can happen if the <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">current_tokens</code> field in your <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">weekly_budget_state</code> record is empty.
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
              Click "Simulate Monday Reset" to reinitialize your categories with the default budget. This will reset all tokens to unspent and set your fund to $0.00.
            </p>
            <Button 
              onClick={handleMondayReset}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Reinitialize Categories
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-8">
        {modules.map((module) => (
          <ModuleSection
            key={module.id}
            module={module}
            onTokenSpend={handleTokenSpend}
          />
        ))}
      </div>

      {/* DEBUG: Show raw state */}
      <Card className="mt-8 rounded-2xl shadow-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
            🔬 Raw Budget State (from DB)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto max-h-96 bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            {JSON.stringify(state, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyDashboard;