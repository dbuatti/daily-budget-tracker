import React, { useEffect } from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import ModuleSection from '@/components/ModuleSection';
import QuickSpendButtons from '@/components/QuickSpendButtons';
import MondayBriefingDialog from '@/components/MondayBriefingDialog';
import TimeDebugInfo from '@/components/TimeDebugInfo'; // Import the new component
import { Loader2 } from 'lucide-react';
import { GENERIC_MODULE_ID } from '@/data/budgetData';
import { formatCurrency } from '@/lib/format';

const LogTransaction = () => {
  const { modules, isLoading, handleTokenSpend, resetBriefing, clearBriefing, spentToday } = useBudgetState();

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
      <h1 className="text-4xl font-extrabold text-center mb-4 text-indigo-900 dark:text-indigo-200">
        Log Transaction
      </h1>
      
      {/* Time Debug Info */}
      <TimeDebugInfo />
      
      {/* New Spent Today Display */}
      <div className="mb-8 p-4 bg-indigo-600 dark:bg-indigo-800 rounded-2xl shadow-2xl text-white text-center">
        <p className="text-sm font-medium opacity-80 uppercase tracking-wider">
          Total Spent Today
        </p>
        <p className="text-5xl font-extrabold mt-1">
          {formatCurrency(spentToday).replace('A$', '$')}
        </p>
      </div>
      
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

      {/* Monday Morning Briefing Dialog */}
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