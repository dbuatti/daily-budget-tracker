import React from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import DashboardHeader from './DashboardHeader';
import CategoryCard from './CategoryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, AlertTriangle } from 'lucide-react';

const WeeklyDashboard: React.FC = () => {
  const { 
    modules, 
    gearTravelFund, 
    totalSpent, 
    isLoading, 
    isError,
    handleTokenSpend, 
    handleMondayReset 
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
      <h1 className="text-4xl font-extrabold text-center mb-8 text-indigo-900 dark:text-indigo-200">
        Weekly Permissions Dashboard
      </h1>

      <DashboardHeader 
        totalSpent={totalSpent} 
        gearTravelFund={gearTravelFund} 
      />

      <div className="flex justify-end mb-6">
        <Button 
          onClick={handleMondayReset} 
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg transition-transform active:scale-[0.98] font-semibold"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Simulate Monday Reset
        </Button>
      </div>

      <div className="space-y-10">
        {modules.map((module) => (
          <Card key={module.id} className="rounded-3xl p-6 shadow-3xl border-4 border-indigo-300/50 dark:border-indigo-800/50 bg-white dark:bg-gray-950/70">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 border-b-4 pb-3 border-indigo-200 dark:border-indigo-800">
                Module {module.id}: {module.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {module.categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onTokenSpend={handleTokenSpend}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WeeklyDashboard;