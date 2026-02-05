import React from 'react';
import { Module } from '@/types/budget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CategoryCard from './CategoryCard';

interface ModuleSectionProps {
  module: Module;
  onTokenSpend: (categoryId: string, tokenId: string) => void;
}

const ModuleSection: React.FC<ModuleSectionProps> = ({ module, onTokenSpend }) => {
  return (
    <Card className="rounded-3xl p-4 sm:p-6 shadow-3xl border-4 border-indigo-300/50 dark:border-indigo-800/50 bg-white dark:bg-gray-950/70">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-2xl sm:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 border-b-4 pb-3 border-indigo-200 dark:border-indigo-800">
          Module {module.id}: {module.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {module.categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onTokenSpend={onTokenSpend}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleSection;