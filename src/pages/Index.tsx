import React, { useEffect, useState, useCallback } from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import ModuleSection from '@/components/ModuleSection';
import QuickSpendButtons from '@/components/QuickSpendButtons';
import MondayBriefingDialog from '@/components/MondayBriefingDialog';
import { Loader2, Bug, RefreshCw, Terminal } from 'lucide-react';
import { GENERIC_MODULE_ID, TOTAL_TOKEN_BUDGET } from '@/data/budgetData';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';

const Index = () => {
  const { 
    modules, 
    gearTravelFund, 
    totalSpent, 
    isLoading, 
    isError,
    handleTokenSpend, 
    handleMondayReset,
    resetBriefing,
    clearBriefing,
    spentToday,
    refetchSpentToday
  } = useBudgetState();

  const { profile } = useUserProfile();
  const [debugMode, setDebugMode] = useState(false);
  const [showTimeDebug, setShowTimeDebug] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    if (profile) {
      addLog(`Profile loaded: timezone=${profile.timezone}, rollover=${profile.day_rollover_hour}`);
    }
  }, [profile, addLog]);

  useEffect(() => {
    const fetchRawTransactions = async () => {
      if (!profile) return;
      
      addLog('Fetching raw transactions...');
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*')
        .eq('user_id', supabase.auth.getUser().data.user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        addLog(`Error fetching transactions: ${error.message}`);
      } else {
        addLog(`Fetched ${data?.length || 0} raw transactions`);
        setRawTransactions(data || []);
      }
    };

    fetchRawTransactions();
  }, [profile, addLog]);

  const handleTestRpc = async () => {
    if (!profile) return;
    
    addLog('Testing get_daily_spent_amount RPC...');
    const { data, error } = await supabase
      .rpc('get_daily_spent_amount', { p_user_id: supabase.auth.getUser().data.user?.id });

    if (error) {
      addLog(`RPC Error: ${error.message}`);
      toast.error(`RPC Error: ${error.message}`);
    } else {
      addLog(`RPC Result: ${data}`);
      toast.success(`Daily spent: ${formatCurrency(data)}`);
    }
  };

  const totalSpentWeekly = totalSpent;

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
            <Bug className="h-10 w-10 text-red-600 mx-auto mb-2" />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="rounded-2xl shadow-xl border-4 border-indigo-300 dark:border-indigo-700 bg-indigo-100/70 dark:bg-indigo-900/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              Total Weekly Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-indigo-900 dark:text-white">
              {formatCurrency(WEEKLY_BUDGET_TOTAL)}
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
              Total available for the week
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl border-4 border-green-300 dark:border-green-700 bg-green-100/70 dark:bg-green-900/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-green-800 dark:text-green-300">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-green-900 dark:text-white">
              {formatCurrency(totalSpentWeekly)}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              out of {formatCurrency(TOTAL_TOKEN_BUDGET).replace('A$', '$')} token budget
            </p>
            <div className="mt-2">
              <span className="text-xs font-semibold inline-block text-green-600 dark:text-green-400">
                {Math.round((totalSpentWeekly / TOTAL_TOKEN_BUDGET) * 100)}% Used
              </span>
              <span className="text-xs font-semibold inline-block text-gray-600 dark:text-gray-400 ml-2">
                {formatCurrency(TOTAL_TOKEN_BUDGET - totalSpentWeekly).replace('A$', '$')} remaining
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xl border-4 border-yellow-300 dark:border-yellow-700 bg-yellow-100/70 dark:bg-yellow-900/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-yellow-800 dark:text-yellow-300">
              Gear/Travel Fund
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-yellow-900 dark:text-white">
              {formatCurrency(gearTravelFund)}
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Savings from previous weeks
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
          <div 
            style={{ width: `${Math.min(100, (totalSpentWeekly / TOTAL_TOKEN_BUDGET) * 100)}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
          >
            <span className="text-xs font-semibold p-0.5">
              {Math.round((totalSpentWeekly / TOTAL_TOKEN_BUDGET) * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center space-x-4 mb-6">
        <Button 
          onClick={() => setDebugMode(!debugMode)}
          variant="outline"
          size="sm"
          className="rounded-xl border-2 border-gray-300 dark:border-gray-700"
        >
          <Bug className="w-4 h-4 mr-2" />
          {debugMode ? 'Hide' : 'Show'} Debug
        </Button>
        
        <Button 
          onClick={handleMondayReset} 
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg transition-transform active:scale-[0.98] font-semibold"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Simulate Monday Reset
        </Button>
      </div>

      {debugMode && (
        <Card className="mb-6 rounded-2xl shadow-xl border-2 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-orange-800 dark:text-orange-300 flex items-center">
              <Bug className="w-5 h-5 mr-2" /> Debug Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Quick Actions</h4>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleTestRpc} size="sm" variant="secondary" className="rounded-lg">
                  Test Daily Spent RPC
                </Button>
                <Button onClick={() => setShowTimeDebug(!showTimeDebug)} size="sm" variant="secondary" className="rounded-lg">
                  {showTimeDebug ? 'Hide' : 'Show'} Time Debug
                </Button>
                <Button onClick={() => refetchSpentToday()} size="sm" variant="secondary" className="rounded-lg">
                  Refresh Spent Today
                </Button>
              </div>
            </div>

            {showTimeDebug && (
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h5 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-300">Time Configuration</h5>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Timezone:</strong> {profile?.timezone || 'Not set'}<br/>
                  <strong>Day Rollover Hour:</strong> {profile?.day_rollover_hour || 0}:00<br/>
                  <strong>Client Time:</strong> {new Date().toLocaleString()}<br/>
                  <strong>Spent Today (from RPC):</strong> {formatCurrency(spentToday)}
                </p>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Recent Logs</h4>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono h-40 overflow-y-auto">
                {logs.length === 0 ? (
                  <p>No logs yet...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Raw Transactions (Latest 10)</h4>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-xs overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="py-1">Amount</th>
                      <th className="py-1">Type</th>
                      <th className="py-1">Category</th>
                      <th className="py-1">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawTransactions.map((tx, i) => (
                      <tr key={i} className="border-b dark:border-gray-700 last:border-0">
                        <td className="py-1">{formatCurrency(tx.amount)}</td>
                        <td className="py-1">{tx.transaction_type}</td>
                        <td className="py-1">{tx.category_id || '-'}</td>
                        <td className="py-1">{new Date(tx.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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

      <QuickSpendButtons />

      {resetBriefing && (
        <MondayBriefingDialog
          isOpen={!!resetBriefing}
          onClose={clearBriefing}
          totalSpent={resetBriefing.totalSpent}
          totalBudget={resetBriefing.totalBudget}
          totalSurplus={resetBriefing.totalSurplus}
          totalDeficit={resetBriefing.totalDeficit}
          newGearTravelFund={resetBriefing.newGearTravelFund}
          categoryBriefings={resetBriefing.categoryBriefings}
        />
      )}
    </div>
  );
};

export default Index;