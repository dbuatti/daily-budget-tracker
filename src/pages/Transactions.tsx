"use client";

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { useBudgetState } from '@/hooks/useBudgetState';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  History, 
  Loader2, 
  ShoppingBag, 
  Car, 
  Home, 
  Heart, 
  Music, 
  Zap,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { initialModules } from '@/data/budgetData';
import { Module } from '@/types/budget';

const getCategoryIcon = (categoryId: string | null) => {
  if (!categoryId) return <Zap className="w-5 h-5" />;
  
  const id = categoryId.toUpperCase();
  if (id.startsWith('A')) return <ShoppingBag className="w-5 h-5" />;
  if (id.startsWith('B')) return <Car className="w-5 h-5" />;
  if (id.startsWith('C')) return <Home className="w-5 h-5" />;
  if (id.startsWith('D')) return <Heart className="w-5 h-5" />;
  if (id.startsWith('E')) return <Music className="w-5 h-5" />;
  if (id.startsWith('F')) return <Zap className="w-5 h-5" />;
  if (id.startsWith('G')) return <Car className="w-5 h-5" />;
  
  return <DollarSign className="w-5 h-5" />;
};

const getCategoryName = (tx: any, currentModules: Module[]) => {
  // 1. Prioritize the saved category_name from the transaction record (if column exists)
  if (tx.category_name) return tx.category_name;
  
  // 2. Fallback to generic spend if no ID
  if (!tx.category_id) return 'Generic Spend';

  // 3. Look up in CURRENT live modules (handles "Beauty" and other custom categories)
  for (const module of currentModules) {
    const category = module.categories.find(c => c.id === tx.category_id);
    if (category) return category.name;
  }
  
  // 4. Fallback to searching initialModules (for legacy/default categories)
  for (const module of initialModules) {
    const category = module.categories.find(c => c.id === tx.category_id);
    if (category) return category.name;
  }
  
  // 5. Final fallback
  return 'Custom Category';
};

const Transactions = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const { modules: currentModules, isLoading: isBudgetLoading } = useBudgetState();

  const { data: transactions, isLoading: isTxLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isTxLoading || isBudgetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
          >
            <ArrowLeft className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </Button>
          <h1 className="text-3xl font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-3">
            <History className="w-8 h-8" />
            Transaction History
          </h1>
        </div>
      </div>

      {!transactions || transactions.length === 0 ? (
        <Card className="rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
              <History className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">No transactions yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
              Start spending your weekly tokens to see your history here!
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              Go to Log
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx) => (
            <Card key={tx.id} className="rounded-2xl shadow-md border border-indigo-100 dark:border-indigo-900/50 hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center p-4">
                  <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-4 shrink-0">
                    {getCategoryIcon(tx.category_id)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                      {getCategoryName(tx, currentModules)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(tx.created_at), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                      {formatCurrency(tx.amount).replace('A$', '$')}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                      {tx.transaction_type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-center text-xs text-gray-400 py-8">
            Showing last 50 transactions
          </p>
        </div>
      )}
    </div>
  );
};

export default Transactions;