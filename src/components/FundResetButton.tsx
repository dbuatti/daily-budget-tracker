import React from 'react';
import { Button } from '@/components/ui/button';
import { useBudgetState } from '@/hooks/useBudgetState';
import { RotateCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const FundResetButton: React.FC = () => {
  const { handleFundAdjustment } = useBudgetState();

  const handleReset = () => {
    // Resetting the fund to 0.00 for correction
    handleFundAdjustment(0.00);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handleReset}
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
  );
};

export default FundResetButton;