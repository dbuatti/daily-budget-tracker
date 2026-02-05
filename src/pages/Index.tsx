import React from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import ModuleSection from '@/components/ModuleSection';
import QuickSpendButtons from '@/components/QuickSpendButtons';
import { Loader2 } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { GENERIC_MODULE_ID } from '@/data/budgetData';

const LogTransaction = () => {
  const { modules, isLoading, handleTokenSpend } = useBudgetState();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Filter out the hidden generic module from the main display
  const visibleModules = modules.filter(module => module.id !== GENERIC_MODULE_ID);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-indigo-900 dark:text-indigo-200">
        Log Transaction
      </h1>
      
      <QuickSpendButtons />

      <div className="space-y-8">
        {visibleModules.map((module) => (
          <ModuleSection
            key={module.id}
            module={module}
            onTokenSpend={handleTokenSpend}
          />
        ))}
      </div>
      <div className="mt-12">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default LogTransaction;