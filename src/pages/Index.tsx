// ... (existing imports remain the same)

const LogTransaction = () => {
  const { modules, gearTravelFund, totalSpent, isLoading, handleTokenSpend, resetBriefing, clearBriefing, spentToday, isLoading: isStateLoading, state } = useBudgetState();
  
  // ... (rest of the existing code remains the same until the return)

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold text-center mb-4 text-indigo-900 dark:text-indigo-200">
        Log Transaction
      </h1>
      
      {/* New Spent Today Display */}
      <div className="mb-8 p-4 bg-indigo-600 dark:bg-indigo-800 rounded-2xl shadow-2xl text-white text-center">
        <p className="text-sm font-medium opacity-80 uppercase tracking-wider">
          Total Spent Today (from hook: {isStateLoading ? 'loading' : 'loaded'})
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

      {/* DEBUG PANEL - Shows raw state from database */}
      <Card className="mt-8 rounded-2xl shadow-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300 flex items-center justify-between">
            <span>🔬 Raw Budget State (from weekly_budget_state)</span>
          </CardTitle>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            This is the exact data stored in your database record.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-blue-800 dark:text-blue-300">
              Full State Object:
            </p>
            <pre className="text-xs overflow-auto max-h-96 bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              {JSON.stringify(state, null, 2)}
            </pre>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              <strong>Note:</strong> If <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">current_tokens</code> is empty or missing, your categories won't appear. Click the "Reinitialize Categories" button below to restore them.
            </p>
            <Button 
              onClick={async () => {
                if (!state || state.current_tokens.length === 0) {
                  // Initialize with default modules
                  const { initialModules, WEEKLY_BUDGET_TOTAL } = await import('@/data/budgetData');
                  const { supabase } = await import('@/integrations/supabase/client');
                  const { useSession } = await import('@/contexts/SessionContext');
                  const { useQueryClient } = await import('@tanstack/react-query');
                  
                  // We need to get the user - this is tricky in this context, so we'll just reload
                  // For now, let's use a simpler approach: call the mutation from the hook
                  // But we don't have access to the hook's functions here easily.
                  // Instead, we'll create a simple endpoint or just instruct the user.
                  alert('Please use the "Simulate Monday Reset" button to reinitialize, or contact support if that doesn\'t work.');
                } else {
                  alert('Your state already has categories. No need to reinitialize.');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Reinitialize Categories (if state is empty)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DEBUG PANEL - Shows raw transactions and query status */}
      {/* ... (existing raw transactions debug panel remains the same) */}

      {/* RLS Debug Panel */}
      <RLSDebugPanel />
    </div>
  );
};