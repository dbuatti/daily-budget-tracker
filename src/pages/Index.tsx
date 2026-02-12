import React, { useEffect, useState, useCallback } from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import ModuleSection from '@/components/ModuleSection';
import QuickSpendButtons from '@/components/QuickSpendButtons';
import MondayBriefingDialog from '@/components/MondayBriefingDialog';
import { Loader2, Bug, RefreshCw, Terminal, AlertCircle, Calendar, ShieldAlert } from 'lucide-react';
import { GENERIC_MODULE_ID } from '@/data/budgetData';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { parseISO, startOfDay, isAfter, startOfWeek, format } from 'date-fns';

const LogTransaction = () => {
  const { 
    modules, 
    isLoading, 
    handleTokenSpend, 
    resetBriefing, 
    clearBriefing, 
    spentToday, 
    totalSpent: totalSpentWeekly, 
    refetchSpentToday,
    handleMondayReset
  } = useBudgetState();
  
  const { profile } = useUserProfile();
  
  const [rawTransactions, setRawTransactions] = React.useState<any[]>([]);
  const [queryStatus, setQueryStatus] = React.useState<string>('idle');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isDebugLoading, setIsDebugLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentResetDate, setCurrentResetDate] = useState<string | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [logMessage, ...prev].slice(0, 50));
  }, []);

  const fetchRawTransactions = async () => {
    setQueryStatus('loading');
    addLog('Fetching raw transactions...');
    try {
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        addLog(`Error fetching raw transactions: ${error.message}`);
        setQueryStatus('error');
      } else {
        addLog(`Fetched ${data?.length || 0} raw transactions`);
        setRawTransactions(data || []);
        setQueryStatus('success');
      }
    } catch (err) {
      addLog(`Exception fetching raw transactions: ${String(err)}`);
      setQueryStatus('error');
    }
  };

  const runDebugChecks = async () => {
    setIsDebugLoading(true);
    addLog('Starting debug checks...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addLog('Not authenticated');
        setDebugInfo({ error: 'Not authenticated' });
        return;
      }

      addLog(`User ID: ${user.id}`);

      const { data: budgetState, error: stateError } = await supabase
        .from('weekly_budget_state')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (stateError) {
        addLog(`Error fetching budget state: ${stateError.message}`);
      } else {
        addLog(`Budget State: last_reset_date=${budgetState.last_reset_date}`);
        setCurrentResetDate(budgetState.last_reset_date);
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('timezone, day_rollover_hour')
        .eq('id', user.id)
        .single();

      if (profileError) {
        addLog(`Error fetching profile: ${profileError.message}`);
      } else {
        addLog(`Profile: timezone=${profileData?.timezone}, day_rollover_hour=${profileData?.day_rollover_hour}`);
      }

      const timezone = profileData?.timezone || 'UTC';

      addLog('Calling debug_daily_spent RPC...');
      const { data: debugResult, error: debugError } = await supabase
        .rpc('debug_daily_spent', { p_user_id: user.id });

      if (debugError) {
        addLog(`Debug RPC error: ${debugError.message}`);
      } else {
        addLog(`Debug RPC result: ${JSON.stringify(debugResult)}`);
        setDebugInfo(debugResult);
      }

      addLog('Calling get_daily_spent_amount RPC...');
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('get_daily_spent_amount', { p_user_id: user.id });

      if (rpcError) {
        addLog(`get_daily_spent_amount error: ${rpcError.message}`);
      } else {
        addLog(`get_daily_spent_amount returned: ${rpcResult}`);
      }

      const resetDate = budgetState?.last_reset_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: weeklyTx } = await supabase
        .from('budget_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', resetDate)
        .order('created_at', { ascending: false });

      addLog(`Transactions since reset (${resetDate}): ${weeklyTx?.length || 0}`);

    } catch (err) {
      addLog(`Debug error: ${String(err)}`);
      console.error('Debug error:', err);
      setDebugInfo({ error: String(err) });
    } finally {
      setIsDebugLoading(false);
    }
  };

  useEffect(() => {
    fetchRawTransactions();
    runDebugChecks();
  }, []);

  useEffect(() => {
    if (profile) {
      addLog(`Profile loaded: timezone=${profile.timezone}, rollover=${profile.day_rollover_hour}`);
      refetchSpentToday();
    }
  }, [profile, refetchSpentToday]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const visibleModules = modules.filter(module => module.id !== GENERIC_MODULE_ID);
  
  // Calculate the actual total budget from the current modules
  const totalBudget = modules.reduce((acc, module) => {
    return acc + module.categories.reduce((catAcc, cat) => catAcc + (cat.baseValue || 0), 0);
  }, 0);

  const weeklyProgress = totalBudget > 0 ? Math.min(100, (totalSpentWeekly / totalBudget) * 100) : 0;
  const weeklyRemaining = totalBudget - totalSpentWeekly;

  const expectedMonday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-indigo-900 dark:text-indigo-200">
        Log Transaction
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <div className="p-6 bg-indigo-600 dark:bg-indigo-800 rounded-2xl shadow-2xl text-white text-center">
            <p className="text-sm font-medium opacity-80 uppercase tracking-wider">
              Today's Spend
            </p>
            <p className="text-5xl font-extrabold mt-2">
              {formatCurrency(spentToday).replace('A$', '$')}
            </p>
            {debugInfo && (
              <p className="text-xs mt-2 opacity-70">
                RPC says: {formatCurrency(debugInfo.spent_amount || 0).replace('A$', '$')}
              </p>
            )}
          </div>
          
          <QuickSpendButtons />
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl shadow-xl border-2 border-indigo-300 dark:border-indigo-700 text-center">
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Weekly Token Budget Used
            </p>
            <p className="text-5xl font-extrabold mt-2 text-indigo-900 dark:text-white">
              {formatCurrency(totalSpentWeekly).replace('A$', '$')}
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
              out of {formatCurrency(totalBudget).replace('A$', '$')} token budget
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Weekly Token Progress</h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-400">
                  {Math.round(weeklyProgress)}% Used
                </span>
                <span className="text-xs font-semibold inline-block text-gray-600 dark:text-gray-400">
                  {formatCurrency(weeklyRemaining).replace('A$', '$')} remaining
                </span>
              </div>
              <div className="overflow-hidden h-3 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-800">
                <div 
                  style={{ width: `${weeklyProgress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {visibleModules.map((module) => (
          <ModuleSection
            key={module.id}
            module={module}
            onTokenSpend={handleTokenSpend}
          />
        ))}
      </div>

      {resetBriefing && (
        <MondayBriefingDialog
          isOpen={!!resetBriefing}
          onClose={clearBriefing}
          {...resetBriefing}
        />
      )}

      <Card className="mt-8 rounded-2xl shadow-xl border-2 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-orange-800 dark:text-orange-300 flex items-center justify-between">
            <span>🔬 Comprehensive Debug Panel</span>
            <div className="flex gap-2">
              <Button 
                onClick={fetchRawTransactions} 
                size="sm" 
                variant="outline"
                className="h-8 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh Tx
              </Button>
              <Button 
                onClick={runDebugChecks} 
                size="sm" 
                variant="default"
                className="h-8 text-xs bg-orange-600 hover:bg-orange-700"
                disabled={isDebugLoading}
              >
                {isDebugLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bug className="w-3 h-3 mr-1" />}
                Run Diagnostics
              </Button>
            </div>
          </CardTitle>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Debugging why spend might not be showing correctly
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-sm mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" /> Budget Reset Date
            </h4>
            <div className="text-xs space-y-2 text-orange-900 dark:text-orange-200">
              <div className="flex justify-between items-center">
                <p><strong>Current Reset Date:</strong> {currentResetDate || 'Loading...'}</p>
                <p className="text-[10px] font-bold text-orange-600">Expected: {expectedMonday}</p>
              </div>
              
              {currentResetDate !== expectedMonday && (
                <div className="p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-red-700 dark:text-red-400 font-bold flex items-center">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Reset Date Mismatch!
                  </p>
                  <p className="text-[10px] mt-1">Your budget week is starting on a Wednesday instead of Monday. This is why Monday's transactions are hidden.</p>
                  <Button 
                    onClick={handleMondayReset}
                    size="sm"
                    className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white h-7 text-[10px]"
                  >
                    Force Reset to Monday ({expectedMonday})
                  </Button>
                </div>
              )}
              
              <p className="text-[10px] opacity-70 italic">Transactions before this date are ignored for the current weekly view.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="bg-orange-100 dark:bg-orange-900/50 p-2">
              <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-sm">
                Recent Transactions (Last 50)
              </h4>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {rawTransactions.length === 0 ? (
                <p className="p-3 text-xs text-orange-600 dark:text-orange-400 italic">No transactions found</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-orange-50 dark:bg-orange-900/30 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-semibold text-orange-800 dark:text-orange-300">Amount</th>
                      <th className="text-left p-2 font-semibold text-orange-800 dark:text-orange-300">Category ID</th>
                      <th className="text-left p-2 font-semibold text-orange-800 dark:text-orange-300">Created (UTC)</th>
                      <th className="text-left p-2 font-semibold text-orange-800 dark:text-orange-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawTransactions.map((tx) => {
                      const txDate = parseISO(tx.created_at);
                      const resetDate = currentResetDate ? startOfDay(parseISO(currentResetDate)) : null;
                      const isThisWeek = resetDate ? (isAfter(txDate, resetDate) || txDate.getTime() === resetDate.getTime()) : false;
                      
                      return (
                        <tr key={tx.id} className="border-t border-orange-100 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                          <td className="p-2 font-bold text-orange-900 dark:text-orange-100">{formatCurrency(tx.amount)}</td>
                          <td className="p-2 text-orange-800 dark:text-orange-200 font-mono">{tx.category_id || 'GENERIC'}</td>
                          <td className="p-2 font-mono text-orange-700 dark:text-orange-300">
                            {tx.created_at}
                          </td>
                          <td className="p-2">
                            {isThisWeek ? (
                              <span className="text-green-600 dark:text-green-400 font-semibold">CURRENT WEEK</span>
                            ) : (
                              <span className="text-red-400 font-medium">PAST WEEK (Ignored)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="bg-orange-100 dark:bg-orange-900/50 p-2 flex items-center">
              <Terminal className="w-4 h-4 mr-2 text-orange-800 dark:text-orange-300" />
              <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-sm">
                Activity Log
              </h4>
            </div>
            <div className="max-h-64 overflow-y-auto bg-gray-900 dark:bg-black p-2 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">No logs yet. Run diagnostics to see activity.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1 text-green-400 dark:text-green-300">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogTransaction;