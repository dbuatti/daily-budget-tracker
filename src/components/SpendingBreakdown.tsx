"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Module } from '@/types/budget';
import { BudgetTransaction } from '@/types/supabase';
import { formatCurrency } from '@/lib/format';

interface SpendingBreakdownProps {
  modules: Module[];
  transactions: BudgetTransaction[];
}

const COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

const SpendingBreakdown: React.FC<SpendingBreakdownProps> = ({ modules, transactions }) => {
  const data = React.useMemo(() => {
    const breakdown: { [key: string]: number } = {};
    
    transactions.forEach(tx => {
      let moduleName = 'Other';
      for (const module of modules) {
        if (module.categories.some(c => c.id === tx.category_id)) {
          moduleName = module.name;
          break;
        }
      }
      breakdown[moduleName] = (breakdown[moduleName] || 0) + Number(tx.amount);
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [modules, transactions]);

  if (data.length === 0) return null;

  return (
    <Card className="rounded-3xl shadow-xl border-2 border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-gray-950/50 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-indigo-800 dark:text-indigo-300">
          Spending Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value).replace('A$', '$')}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)'
              }}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SpendingBreakdown;