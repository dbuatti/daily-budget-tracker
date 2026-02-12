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
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-2">
        <div className="h-1 w-8 bg-indigo-600 rounded-full" />
        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white uppercase">
          {module.name}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {module.categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onTokenSpend={onTokenSpend}
          />
        ))}
      </div>
    </div>
  );
};

export default ModuleSection;