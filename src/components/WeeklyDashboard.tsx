import React, { useState, useMemo, useCallback } from 'react';
import { initialModules, WEEKLY_BUDGET_TOTAL } from '@/data/budgetData';
import { Module } from '@/types/budget';
import DashboardHeader from './DashboardHeader';
import CategoryCard from './CategoryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import { formatCurrency } from '@/lib/format';

const WeeklyDashboard: React.FC = () => {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [gearTravelFund, setGearTravelFund] = useState<number>(0);

  const totalSpent = useMemo(() => {
    return modules.reduce((moduleAcc, module) => {
      return moduleAcc + module.categories.reduce((catAcc, category) => {
        return catAcc + category.tokens.filter(t => t.spent).reduce((tokenAcc, token) => tokenAcc + token.value, 0);
      }, 0);
    }, 0);
  }, [modules]);

  const handleTokenSpend = useCallback((categoryId: string, tokenId: string) => {
    setModules(prevModules =>
      prevModules.map(module => ({
        ...module,
        categories: module.categories.map(category => {
          if (category.id === categoryId) {
            return {
              ...category,
              tokens: category.tokens.map(token => {
                if (token.id === tokenId && !token.spent) {
                  showSuccess(`Spent ${formatCurrency(token.value)} on ${category.name}.`);
                  return { ...token, spent: true };
                }
                return token;
              }),
            };
          }
          return category;
        }),
      }))
    );
  }, []);

  const handleMondayReset = useCallback(() => {
    const remainingBudget = WEEKLY_BUDGET_TOTAL - totalSpent;
    
    let newGearTravelFund = gearTravelFund;

    if (remainingBudget > 0) {
      // 1. Calculate Surplus & Transfer
      const surplus = remainingBudget;
      newGearTravelFund += surplus;
      showSuccess(`Weekly surplus of ${formatCurrency(surplus)} swept to Gear/Travel Fund!`);
    } else if (remainingBudget < 0) {
      // 2. Handle Deficit
      const deficit = Math.abs(remainingBudget);
      showSuccess(`Overspent by ${formatCurrency(deficit)}. This deficit would be subtracted from next week's budget.`);
    } else {
        showSuccess("Budget perfectly balanced. No surplus or deficit.");
    }

    // 3. Refresh UI: Un-grey all buttons. Reset "Spent" counter to $0.
    setModules(initialModules);
    setGearTravelFund(newGearTravelFund);
  }, [totalSpent, gearTravelFund]);

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