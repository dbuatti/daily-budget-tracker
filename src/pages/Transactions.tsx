"use client";

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { useBudgetState } from '@/hooks/useBudgetState';
import { formatCurrency } from '@/lib/format';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
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
  DollarSign,
  Search,
  Filter,
  X,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { initialModules } from '@/data/budgetData';
import { Module } from '@/types/budget';
import { cn } from '@/lib/utils';

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
  if (tx.category_name) return tx.category_name;
  if (!tx.category_id) return 'Generic Spend';
  for (const module of currentModules) {
    const category = module.categories.find(c => c.id === tx.category_id);
    if (category) return category.name;
  }
  for (const module of initialModules) {
    const category = module.categories.find(c => c.id === tx.category_id);
    if (category) return category.name;
  }
  return 'Custom Category';
};

const Transactions = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const { modules: currentModules, isLoading: isBudgetLoading, deleteTransaction } = useBudgetState();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const { data: transactions, isLoading: isTxLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(tx => {
      const categoryName = getCategoryName(tx, currentModules).toLowerCase();
      const matchesSearch = categoryName.includes(searchQuery.toLowerCase()) || 
                           (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!selectedModule) return matchesSearch;

      const module = currentModules.find(m => m.id === selectedModule);
      const matchesModule = module?.categories.some(c => c.id === tx.category_id);
      
      return matchesSearch && matchesModule;
    });
  }, [transactions, searchQuery, selectedModule, currentModules]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    filteredTransactions.forEach(tx => {
      const date = startOfDay(new Date(tx.created_at)).toISOString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => ({
      date,
      items: groups[date]
    }));
  }, [filteredTransactions]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM do');
  };

  if (isTxLoading || isBudgetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
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
              History
            </h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search transactions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 dark:border-indigo-900"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            <Button
              variant={selectedModule === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedModule(null)}
              className="rounded-full whitespace-nowrap"
            >
              All
            </Button>
            {currentModules.map(m => (
              <Button
                key={m.id}
                variant={selectedModule === m.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedModule(m.id)}
                className="rounded-full whitespace-nowrap"
              >
                {m.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <Card className="rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
              <History className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">No matches found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedTransactions.map((group) => (
            <div key={group.date} className="space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">
                {getDateLabel(group.date)}
              </h2>
              <div className="space-y-3">
                {group.items.map((tx) => (
                  <Card key={tx.id} className="rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/50 hover:shadow-md transition-shadow overflow-hidden group">
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
                            {format(new Date(tx.created_at), 'h:mm a')}
                          </p>
                        </div>
                        <div className="text-right ml-4 flex items-center gap-4">
                          <div>
                            <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                              {formatCurrency(tx.amount).replace('A$', '$')}
                            </p>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                              {tx.transaction_type.replace('_', ' ')}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => tx.id && deleteTransaction(tx.id)}
                            className="h-8 w-8 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          <p className="text-center text-xs text-gray-400 py-8">
            Showing last 200 transactions
          </p>
        </div>
      )}
    </div>
  );
};

export default Transactions;