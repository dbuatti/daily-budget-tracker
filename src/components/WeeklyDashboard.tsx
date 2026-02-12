import React from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import DashboardHeader from './DashboardHeader';
import ModuleSection from './ModuleSection';
import DebugActions from './DebugActions';
import BudgetArchitect from './BudgetArchitect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, AlertTriangle, History } from 'lucide-react';
import BudgetRemainingBar from './BudgetRemainingBar';
import { WEEKLY_BUDGET_TOTAL } from '@/data/budgetData';
import { useNavigate } from 'react-router-dom';

const WeeklyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    modules, 
    gearTravelFund, 
    totalSpent, 
    config,
    isLoading, 
    isError,
    handleTokenSpend, 
    handleMondayReset,
    saveStrategy
  } = useBudgetState();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-xl border-red-400 dark:border-red-700">
          <CardHeader className="text-center">
            <AlertTriangle className="h-10 w-10 text-red-600 mx-auto mb-2" />
            <CardTitle className="text-xl font-bold text-red-600 dark:text-red-400">
              Database Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-600 dark:text-gray-400">
            <p className="mb-4">
              We couldn't load your budget data. This might be a temporary issue with the database API.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Try Reloading
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-4xl font-extrabold text-indigo-900 dark:text-indigo-200">
          Weekly Permissions
        </h1>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/transactions')}
            className="rounded-xl border-2 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-900/30"
          >
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
          <BudgetArchitect 
            initialIncome={config.annualIncome} 
            initialModules={modules} 
            onSave={saveStrategy} 
          />
        </div>
      </div>

      <DashboardHeader 
        totalSpent={totalSpent} 
        gearTravelFund={gearTravelFund} 
      />

      <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
        <BudgetRemainingBar spent={totalSpent} total={WEEKLY_BUDGET_TOTAL} className="border border-gray-200 dark:border-gray-700" />
      </div>

      <div className="flex justify-end items-center space-x-4 mb-6 mt-6">
        <DebugActions />
        <Button 
          onClick={handleMondayReset} 
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg transition-transform active:scale-[0.98] font-semibold"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Simulate Monday Reset
        </Button>
      </div>

      <div className="space-y-8">
        {modules.map((module) => (
          <ModuleSection
            key={module.id}
            module={module}
            onTokenSpend={handleTokenSpend}
          />
        ))}
      </div>
    </div>
  );
};

export default WeeklyDashboard;