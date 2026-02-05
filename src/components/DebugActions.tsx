import React from 'react';
import { Button } from '@/components/ui/button';
import { useBudgetState } from '@/hooks/useBudgetState';
import { RotateCcw, ZapOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DebugActions: React.FC = () => {
  const { handleFundAdjustment, handleFullReset } = useBudgetState();

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
    </div>
  );
};

export default DebugActions;