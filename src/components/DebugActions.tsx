import React from 'react';
import { Button } from '@/components/ui/button';
import { useBudgetState } from '@/hooks/useBudgetState';
import { RotateCcw, ZapOff, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DebugActions: React.FC = () => {
  const { handleFundAdjustment, handleFullReset, resetToInitialBudgets } = useBudgetState();

  const handleFundReset = () => {
    // Resetting the fund to 0.00 for correction
    handleFundAdjustment(0.00);
  };

  return (
    <div className="flex space-x-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleFundReset}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-red-600 text-white border-red-700">
          <p>Reset Gear/Travel Fund to $0.00 (Debug)</p>
        </TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleFullReset}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
          >
            <ZapOff className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-red-600 text-white border-red-700">
          <p>FULL Budget Reset (Wipes all spent tokens and resets fund to $0.00)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={resetToInitialBudgets}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-green-500 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-green-600 text-white border-green-700">
          <p>Reset to Initial Budgets (Restore original token values and unspent status)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default DebugActions;