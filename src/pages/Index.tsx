import React, { useEffect, useState } from 'react';
import { useBudgetState } from '@/hooks/useBudgetState';
import ModuleSection from '@/components/ModuleSection';
import QuickSpendButtons from '@/components/QuickSpendButtons';
import MondayBriefingDialog from '@/components/MondayBriefingDialog';
import { Loader2, Bug, RefreshCw } from 'lucide-react';
import { GENERIC_MODULE_ID } from '@/data/budgetData';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getDayBoundaries } from '@/lib/time-utils';

const LogTransaction = () => {
  const { modules, isLoading, handleTokenSpend, resetBriefing, clearBriefing, spentToday, isLoading: isStateLoading, totalSpent: totalSpentWeekly, refetchSpentToday } = useBudgetState();
  const { profile } = useUserProfile();
  
  // State for raw transactions debug panel
  const [rawTransactions, setRawTransactions] = React.useState<any[]>([]);
  const [queryStatus, setQueryStatus] = React.useState<string>('idle');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isDebugLoading, setIsDebugLoading] = useState(false);

  const fetchRawTransactions = async () => {
    setQueryStatus('loading');
    try {
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
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

  const runDebugChecks = async () => {
    setIsDebugLoading(true);
    try {
      const userId = supabase.auth.getUser().then(({ data }) => data.user?.id);
      const user = await userId;
      
      if (!user) {
        setDebugInfo({ error: 'Not authenticated' });
        return;
      }

      // 1. Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('timezone, day_rollover_hour')
        .eq('id', user.id)
        .single();

      // 2. Calculate day boundaries
      const today = new Date();
      const boundaries = getDayBoundaries(user.id, today);
      
      // 3. Get all transactions for today based on calculated boundaries
      const { data: todayTx, error: txError } = await supabase
        .from('budget_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', boundaries.start_time)
        .lt('created_at', boundaries.end_time)
        .order('created_at', { ascending: false });

      // 4. Get all transactions in a wider window (last 24 hours) to see if any exist
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: last24hTx } = await supabase
        .from('budget_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false });

      // 5. Call the RPC directly to see what it returns
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('get_daily_spent_amount', { p_user_id: user.id });

      setDebugInfo({
        userTimezone: profileData?.timezone || 'Not set',
        dayRolloverHour: profileData?.day_rollover_hour || 0,
        calculatedBoundaries: {
          start: boundaries.start_time,
          end: boundaries.end_time
        },
        todayTransactions: todayTx || [],
        last24hTransactions: last24hTx || [],
        rpcResult: rpcResult,
        rpcError: rpcError?.message,
        totalFromTodayTx: (todayTx || []).reduce((sum, tx) => sum + Number(tx.amount), 0),
        totalFrom24hTx: (last24hTx || []).reduce((sum, tx) => sum + Number(tx.amount), 0)
      });

      console.log('Debug Info:', {
        profile: profileData,
        boundaries,
        todayTx,
        rpcResult,
        rpcError
      });

    } catch (err) {
      console.error('Debug error:', err);
      setDebugInfo({ error: String(err) });
    } finally {
      setIsDebugLoading(false);
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
      <h1 className="text-4xl font-extrabold text-center mb-8 text-indigo-900 dark:text-indigo-200">
        Log Transaction
      </h1>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column - Daily Spend */}
        <div className="space-y-6">
          <div className="p-6 bg-indigo-600 dark:bg-indigo-800 rounded-2xl shadow-2xl text-white text-center">
            <p className="text-sm font-medium opacity-80 uppercase tracking-wider">
              Today's Spend
            </p>
            <p className="text-5xl font-extrabold mt-2">
              {formatCurrency(spentToday).replace('A$', '$')}
            </p>
            <p className="text-xs mt-2 opacity-70">
              (from RPC: {formatCurrency(debugInfo?.rpcResult || 0).replace('A$', '$')})
            </p>
          </div>
          
          <QuickSpendButtons />
        </div>

        {/* Right Column - Weekly Total */}
        <div className="space-y-6">
          <div className="p-6 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl shadow-xl border-2 border-indigo-300 dark:border-indigo-700 text-center">
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Weekly Total
            </p>
            <p className="text-5xl font-extrabold mt-2 text-indigo-900 dark:text-white">
              {formatCurrency(totalSpentWeekly).replace('A$', '$')}
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
              out of {formatCurrency(382.00).replace('A$', '$')} token budget
            </p>
          </div>

          {/* Simple weekly progress visualization */}
          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Weekly Progress</h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-400">
                  {Math.round((totalSpentWeekly / 382.00) * 100)}% Used
                </span>
                <span className="text-xs font-semibold inline-block text-gray-600 dark:text-gray-400">
                  {formatCurrency(382.00 - totalSpentWeekly).replace('A$', '$')} remaining
                </span>
              </div>
              <div className="overflow-hidden h-3 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-800">
                <div 
                  style={{ width: `${Math.min(100, (totalSpentWeekly / 382.00) * 100)}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Sections - Full Width Below */}
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

      {/* COMPREHENSIVE DEBUG PANEL */}
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
            Debugging why daily spend shows 0
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Profile Info */}
          <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-sm mb-2">User Profile</h4>
            <div className="text-xs space-y-1 text-orange-900 dark:text-orange-200">
              <p><strong>Timezone:</strong> {profile?.timezone || 'Loading...'}</p>
              <p><strong>Day Rollover Hour:</strong> {profile?.day_rollover_hour || 0}</p>
              <p><strong>Client Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
            </div>
          </div>

          {/* RPC Result */}
          <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-sm mb-2">RPC Result (get_daily_spent_amount)</h4>
            <div className="text-xs space-y-1 text-orange-900 dark:text-orange-200">
              <p><strong>Returned Value:</strong> {formatCurrency(debugInfo?.rpcResult || 0)}</p>
              <p><strong>Error:</strong> {debugInfo?.rpcError || 'None'}</p>
            </div>
          </div>

          {/* Day Boundaries */}
          {debugInfo?.calculatedBoundaries && (
            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-sm mb-2">Calculated Day Boundaries</h4>
              <div className="text-xs space-y-1 text-orange-900 dark:text-orange-200">
                <p><strong>Start:</strong> {new Date(debugInfo.calculatedBoundaries.start).toLocaleString()}</p>
                <p><strong>End:</strong> {new Date(debugInfo.calculatedBoundaries.end).toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Transaction Counts */}
          <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-sm mb-2">Transaction Analysis</h4>
            <div className="text-xs space-y-1 text-orange-900 dark:text-orange-200">
              <p><strong>Transactions in calculated day:</strong> {debugInfo?.todayTransactions?.length || 0}</p>
              <p><strong>Transactions in last 24h:</strong> {debugInfo?.last24hTransactions?.length || 0}</p>
              <p><strong>Sum from today's transactions:</strong> {formatCurrency(debugInfo?.totalFromTodayTx || 0)}</p>
              <p><strong>Sum from last 24h:</strong> {formatCurrency(debugInfo?.totalFrom24hTx || 0)}</p>
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="overflow-hidden rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="bg-orange-100 dark:bg-orange-900/50 p-2">
              <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-sm">
                Recent Transactions (All - Last 20)
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
                      <th className="text-left p-2 font-semibold text-orange-800 dark:text-orange-300">Type</th>
                      <th className="text-left p-2 font-semibold text-orange-800 dark:text-orange-300">Category</th>
                      <th className="text-left p-2 font-semibold text-orange-800 dark:text-orange-300">Created (UTC)</th>
                      <th className="text-left p-2 font-semibold text-orange-800 dark:text-orange-300">In Range?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawTransactions.map((tx) => {
                      const txDate = new Date(tx.created_at);
                      const inRange = debugInfo?.calculatedBoundaries && 
                        txDate >= new Date(debugInfo.calculatedBoundaries.start) && 
                        txDate < new Date(debugInfo.calculatedBoundaries.end);
                      return (
                        <tr key={tx.id} className="border-t border-orange-100 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                          <td className="p-2 font-bold text-orange-900 dark:text-orange-100">{formatCurrency(tx.amount)}</td>
                          <td className="p-2 text-orange-800 dark:text-orange-200">{tx.transaction_type}</td>
                          <td className="p-2 text-orange-800 dark:text-orange-200">{tx.category_id || '—'}</td>
                          <td className="p-2 font-mono text-orange-700 dark:text-orange-300">
                            {txDate.toLocaleString()}
                          </td>
                          <td className="p-2">
                            {inRange ? (
                              <span className="text-green-600 dark:text-green-400 font-semibold">✓ YES</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400">✗ NO</span>
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

          {/* Console Log Instructions */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-sm mb-2">💡 Check Browser Console</h4>
            <p className="text-xs text-blue-900 dark:text-blue-200">
              Open DevTools Console (F12) to see detailed logs from the RPC call and timezone calculations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogTransaction;