import React from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import DashboardHeader from './DashboardHeader';
import CategoryCard from './CategoryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

const WeeklyDashboard: React.FC = () => {
  const { 
    modules, 
    gearTravelFund, 
    totalSpent, 
    isLoading, 
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
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md transition-transform active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Simulate Monday Reset
        </Button>
      </div>

      <div className="space-y-10">
        {modules.map((module) => (
          <Card key={module.id} className="rounded-3xl p-6 shadow-2xl border-4 border-indigo-50 dark:border-indigo-900/30">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 border-b pb-2 border-indigo-100 dark:border-indigo-900">
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