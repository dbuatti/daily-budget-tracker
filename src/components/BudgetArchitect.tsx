import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2, Plus, Trash2, Info, Wallet } from 'lucide-react';
import { Module, Category } from '@/types/budget';
import { formatCurrency } from '@/lib/format';
import { WEEKS_IN_YEAR } from '@/data/budgetData';
import { cn } from '@/lib/utils';

interface BudgetArchitectProps {
  initialIncome: number;
  initialModules: Module[];
  onSave: (income: number, modules: Module[]) => void;
}

const BudgetArchitect: React.FC<BudgetArchitectProps> = ({ initialIncome, initialModules, onSave }) => {
  const [income, setIncome] = useState(initialIncome);
  const [modules, setModules] = useState<Module[]>(JSON.parse(JSON.stringify(initialModules)));
  const [isOpen, setIsOpen] = useState(false);

  const weeklyIncome = income / WEEKS_IN_YEAR;

  // Calculate totals for validation
  const totalPercentage = modules.reduce((sum, m) => 
    sum + m.categories.reduce((cs, c) => cs + (c.mode === 'percentage' ? (c.percentage || 0) : 0), 0)
  , 0);

  const totalFixed = modules.reduce((sum, m) => 
    sum + m.categories.reduce((cs, c) => cs + (c.mode === 'fixed' ? c.baseValue : 0), 0)
  , 0);

  const totalWeeklyAllocated = totalFixed + (weeklyIncome * totalPercentage / 100);
  const isOverAllocated = totalWeeklyAllocated > weeklyIncome;

  const handleAddCategory = (moduleId: string) => {
    const newModules = modules.map(m => {
      if (m.id === moduleId) {
        const newCat: Category = {
          id: `custom-${Date.now()}`,
          name: 'New Category',
          tokens: [],
          baseValue: 0,
          percentage: 0,
          mode: 'percentage',
          isCustom: true,
          tokenValue: 10
        };
        return { ...m, categories: [...m.categories, newCat] };
      }
      return m;
    });
    setModules(newModules);
  };

  const handleUpdateCategory = (moduleId: string, catId: string, updates: Partial<Category>) => {
    const newModules = modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          categories: m.categories.map(c => c.id === catId ? { ...c, ...updates } : c)
        };
      }
      return m;
    });
    setModules(newModules);
  };

  const handleDeleteCategory = (moduleId: string, catId: string) => {
    const newModules = modules.map(m => {
      if (m.id === moduleId) {
        return { ...m, categories: m.categories.filter(c => c.id !== catId) };
      }
      return m;
    });
    setModules(newModules);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-xl border-2 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-900/30">
          <Settings2 className="w-4 h-4 mr-2" />
          Budget Architect
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 border-b bg-indigo-50/50 dark:bg-indigo-950/30">
          <SheetTitle className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100 flex items-center">
            <Wallet className="w-6 h-6 mr-2 text-indigo-600" />
            Budget Architect
          </SheetTitle>
          <SheetDescription>
            Design your financial strategy. Adjust income and category rules.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* Global Income Section */}
            <div className="space-y-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900 shadow-sm">
              <Label className="text-lg font-bold text-indigo-800 dark:text-indigo-300">Ideal Annual Income (AUD)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">$</span>
                <Input 
                  type="number" 
                  value={income} 
                  onChange={(e) => setIncome(Number(e.target.value))}
                  className="pl-10 h-16 text-3xl font-black rounded-xl border-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-sm text-gray-500">Weekly Disposable: <span className="font-bold text-indigo-600">{formatCurrency(weeklyIncome)}</span></p>
            </div>

            {/* Modules & Categories */}
            {modules.map((module) => (
              <div key={module.id} className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-gray-100 dark:border-gray-800 pb-2">
                  <h3 className="text-xl font-black text-gray-800 dark:text-gray-200">{module.name}</h3>
                  <Button variant="ghost" size="sm" onClick={() => handleAddCategory(module.id)} className="text-indigo-600 hover:text-indigo-700">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>

                <div className="space-y-3">
                  {module.categories.map((category) => (
                    <div key={category.id} className="group relative p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Name & Icon */}
                        <div className="md:col-span-4 space-y-1">
                          <Input 
                            value={category.name} 
                            onChange={(e) => handleUpdateCategory(module.id, category.id, { name: e.target.value })}
                            className="font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                          />
                          <div className="flex items-center text-[10px] text-gray-400 uppercase tracking-widest">
                            <Info className="w-3 h-3 mr-1" />
                            {category.mode === 'percentage' ? `${category.percentage}% of income` : 'Fixed Amount'}
                          </div>
                        </div>

                        {/* Mode Toggle */}
                        <div className="md:col-span-3 flex items-center justify-center space-x-2">
                          <span className={cn("text-xs font-bold", category.mode === 'fixed' ? "text-indigo-600" : "text-gray-400")}>$</span>
                          <Switch 
                            checked={category.mode === 'percentage'} 
                            onCheckedChange={(checked) => handleUpdateCategory(module.id, category.id, { mode: checked ? 'percentage' : 'fixed' })}
                          />
                          <span className={cn("text-xs font-bold", category.mode === 'percentage' ? "text-indigo-600" : "text-gray-400")}>%</span>
                        </div>

                        {/* Value Input */}
                        <div className="md:col-span-4">
                          <div className="relative">
                            <Input 
                              type="number"
                              value={category.mode === 'percentage' ? category.percentage : category.baseValue}
                              onChange={(e) => handleUpdateCategory(module.id, category.id, category.mode === 'percentage' ? { percentage: Number(e.target.value) } : { baseValue: Number(e.target.value) })}
                              className="pr-8 font-mono font-bold"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                              {category.mode === 'percentage' ? '%' : '$'}
                            </span>
                          </div>
                        </div>

                        {/* Delete */}
                        <div className="md:col-span-1 flex justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(module.id, category.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Token Preview */}
                      <div className="mt-3 flex flex-wrap gap-1 opacity-40">
                        {Array.from({ length: Math.ceil((category.mode === 'percentage' ? (weeklyIncome * (category.percentage || 0) / 100) : category.baseValue) / (category.tokenValue || 10)) }).map((_, i) => (
                          <div key={i} className="w-4 h-4 rounded-full bg-indigo-400" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t bg-gray-50 dark:bg-gray-950/50">
          <div className="w-full space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Weekly Allocation</p>
                <p className={cn("text-2xl font-black", isOverAllocated ? "text-red-600" : "text-green-600")}>
                  {formatCurrency(totalWeeklyAllocated)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">Budget Usage</p>
                <p className={cn("text-lg font-bold", isOverAllocated ? "text-red-600" : "text-indigo-600")}>
                  {Math.round((totalWeeklyAllocated / weeklyIncome) * 100)}%
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => {
                onSave(income, modules);
                setIsOpen(false);
              }}
              disabled={isOverAllocated}
              className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xl"
            >
              Save Strategy
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default BudgetArchitect;