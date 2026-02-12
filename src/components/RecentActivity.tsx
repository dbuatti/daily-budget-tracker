"use client";

import React from 'react';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { History, ShoppingBag, Car, Home, Heart, Music, Zap, DollarSign, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BudgetTransaction } from '@/types/supabase';
import { Module } from '@/types/budget';
import { initialModules } from '@/data/budgetData';

interface RecentActivityProps {
  transactions: BudgetTransaction[];
  modules: Module[];
  onDelete: (id: string) => void;
}

const getCategoryIcon = (categoryId: string | null) => {
  if (!categoryId) return <Zap className="w-4 h-4" />;
  const id = categoryId.toUpperCase();
  if (id.startsWith('A')) return <ShoppingBag className="w-4 h-4" />;
  if (id.startsWith('B')) return <Car className="w-4 h-4" />;
  if (id.startsWith('C')) return <Home className="w-4 h-4" />;
  if (id.startsWith('D')) return <Heart className="w-4 h-4" />;
  if (id.startsWith('E')) return <Music className="w-4 h-4" />;
  return <DollarSign className="w-4 h-4" />;
};

const getCategoryName = (tx: BudgetTransaction, currentModules: Module[]) => {
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

const RecentActivity: React.FC<RecentActivityProps> = ({ transactions, modules, onDelete }) => {
  if (transactions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <History className="w-4 h-4" /> Recent Activity
        </h3>
      </div>
      <div className="space-y-2">
        {transactions.slice(0, 3).map((tx) => (
          <Card key={tx.id} className="rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-white/50 dark:bg-gray-900/30 shadow-sm overflow-hidden group">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  {getCategoryIcon(tx.category_id || null)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                    {getCategoryName(tx, modules)}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-gray-400">
                      {format(new Date(tx.created_at), 'h:mm a')}
                    </p>
                    {tx.description && (
                      <div className="flex items-center gap-1 text-[10px] text-indigo-500 dark:text-indigo-400 font-medium truncate max-w-[100px]">
                        <FileText className="w-2.5 h-2.5" />
                        {tx.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(tx.amount).replace('A$', '$')}
                </p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => tx.id && onDelete(tx.id)}
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;