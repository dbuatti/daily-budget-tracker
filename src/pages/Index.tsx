import React, { useEffect } from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import ModuleSection from '@/components/ModuleSection';
import QuickSpendButtons from '@/components/QuickSpendButtons';
import MondayBriefingDialog from '@/components/MondayBriefingDialog';
import TimeDebugInfo from '@/components/TimeDebugInfo';
import { Loader2 } from 'lucide-react';
import { GENERIC_MODULE_ID } from '@/data/budgetData';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const LogTransaction = () => {
  const { modules, isLoading, handleTokenSpend, resetBriefing, clearBriefing, spentToday, isLoading: isStateLoading } = useBudgetState();
  
  // State for raw transactions debug panel
  const [rawTransactions, setRawTransactions] = React.useState<any[]>([]);
  const [queryStatus, setQueryStatus] = React.useState<string>('idle');

  const fetchRawTransactions = async () => {
    setQueryStatus('loading');
    try {
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching raw transactions:', error);
        setQueryStatus('error');
      } else {
        console.log('Raw transactions from DB:', data);
        setRawTransactions(data || []);
        setQueryStatus('success');
      }
    } catch (err) {
      console.error('Exception fetching raw transactions:', err);
      setQueryStatus('error');
    }
  };

  useEffect(() => {
    fetchRawTransactions();
  }, []);

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

      {/* DEBUG PANEL - Shows raw transactions and query status */}
      <Card className="mt-8 rounded-2xl shadow-xl border-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-red-800 dark:text-red-300 flex items-center justify-between">
            <span>🔬 Debug Panel - Raw Transactions</span>
            <Button 
              onClick={fetchRawTransactions} 
              size="sm" 
              variant="outline"
              className="h-8 text-xs"
            >
              Refresh
            </Button>
          </CardTitle>
          <p className="text-xs text-red-600 dark:text-red-400">
            Query Status: {queryStatus} | Last fetch: {new Date().toLocaleTimeString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-red-800 dark:text-red-300">
              Showing last 10 transactions from budget_transactions table:
            </p>
            {rawTransactions.length === 0 ? (
              <p className="text-red-600 dark:text-red-400 italic">No transactions found in database.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-red-200 dark:border-red-800">
                      <th className="text-left p-1">ID</th>
                      <th className="text-left p-1">Amount</th>
                      <th className="text-left p-1">Type</th>
                      <th className="text-left p-1">Category</th>
                      <th className="text-left p-1">Created At (UTC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-red-100 dark:border-red-900/50">
                        <td className="p-1 font-mono">{tx.id.slice(0, 8)}...</td>
                        <td className="p-1 font-bold">{formatCurrency(tx.amount)}</td>
                        <td className="p-1">{tx.transaction_type}</td>
                        <td className="p-1">{tx.category_id || '—'}</td>
                        <td className="p-1 font-mono text-gray-600 dark:text-gray-400">
                          {new Date(tx.created_at).toISOString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Note: The "Total Spent Today" uses get_daily_spent_amount() RPC which filters by timezone and rollover. 
              Check your Supabase database logs for detailed RPC execution logs.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogTransaction;