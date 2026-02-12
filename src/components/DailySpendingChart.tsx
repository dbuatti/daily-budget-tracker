"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetTransaction } from '@/types/supabase';
import { formatCurrency } from '@/lib/format';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';

interface DailySpendingChartProps {
  transactions: BudgetTransaction[];
  lastResetDate: string;
}

const DailySpendingChart: React.FC<DailySpendingChartProps> = ({ transactions, lastResetDate }) => {
  const data = React.useMemo(() => {
    const startDate = parseISO(lastResetDate);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(startDate, i);
      const dayTransactions = transactions.filter(tx => isSameDay(parseISO(tx.created_at), day));
      const total = dayTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
      
      days.push({
        name: format(day, 'EEE'),
        fullDate: format(day, 'MMM do'),
        amount: total,
        isToday: isSameDay(day, new Date()),
      });
    }
    
    return days;
  }, [transactions, lastResetDate]);

  return (
    <Card className="rounded-3xl shadow-xl border-2 border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-gray-950/50 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-indigo-800 dark:text-indigo-300">
          Weekly Spending Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-gray-900 p-3 rounded-xl shadow-xl border border-indigo-100 dark:border-indigo-800">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{data.fullDate}</p>
                      <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(data.amount).replace('A$', '$')}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isToday ? '#4f46e5' : '#c7d2fe'} 
                  className="transition-all duration-300 hover:fill-indigo-500"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DailySpendingChart;