import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from '@/lib/format';
import { Zap, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BriefingItem {
  categoryName: string;
  difference: number; // Positive for surplus, Negative for deficit
  newBaseValue?: number; // Only present if deficit caused an adjustment
}

interface MondayBriefingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  totalSpent: number;
  totalBudget: number;
  totalSurplus: number;
  totalDeficit: number;
  newGearTravelFund: number;
  categoryBriefings: BriefingItem[];
}

const MondayBriefingDialog: React.FC<MondayBriefingDialogProps> = ({
  isOpen,
  onClose,
  totalSpent,
  totalBudget,
  totalSurplus,
  totalDeficit,
  newGearTravelFund,
  categoryBriefings,
}) => {
  const overallStatus = totalBudget - totalSpent;

  const renderBriefingItems = () => {
    return categoryBriefings.map((item, index) => {
      const isDeficit = item.difference < 0;
      const icon = isDeficit ? <AlertTriangle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />;
      const amount = formatCurrency(Math.abs(item.difference));

      let message;
      if (isDeficit) {
        message = (
          <>
            You went over by <span className="font-bold text-red-600 dark:text-red-400">{amount}</span> in <span className="font-semibold">{item.categoryName}</span>. This week's budget is adjusted to {formatCurrency(item.newBaseValue || 0)}.
          </>
        );
      } else if (item.difference > 0) {
        message = (
          <>
            You saved <span className="font-bold text-green-600 dark:text-green-400">{amount}</span> in <span className="font-semibold">{item.categoryName}</span>. This surplus was vaulted.
          </>
        );
      } else {
        return null; // Skip categories with zero difference
      }

      return (
        <div key={index} className={cn(
          "flex items-start p-3 rounded-xl transition-colors",
          isDeficit ? "bg-red-50/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" : "bg-green-50/50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
        )}>
          {icon}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{message}</p>
        </div>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-8">
        <DialogHeader className="text-center">
          <Zap className="h-10 w-10 text-indigo-600 dark:text-indigo-400 mx-auto mb-2 animate-pulse" />
          <DialogTitle className="text-3xl font-extrabold text-indigo-800 dark:text-indigo-300">
            Monday Morning Briefing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Success Metric */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800 text-center">
            <p className="text-lg font-medium text-indigo-700 dark:text-indigo-300">
              Last week you spent <span className="font-extrabold">{formatCurrency(totalSpent)}</span> out of <span className="font-extrabold">{formatCurrency(totalBudget)}</span>.
            </p>
            <p className={cn("text-sm mt-1 font-semibold", overallStatus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                {overallStatus >= 0 ? `Net Surplus: ${formatCurrency(overallStatus)}` : `Net Deficit: ${formatCurrency(Math.abs(overallStatus))}`}
            </p>
          </div>

          {/* The Reward */}
          {totalSurplus > 0 && (
            <div className="flex items-center p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3 flex-shrink-0" />
              <div>
                <p className="font-bold text-yellow-800 dark:text-yellow-300">The Vault Reward</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-extrabold text-yellow-600 dark:text-yellow-400">{formatCurrency(totalSurplus)}</span> has been moved to your Gear/Travel Fund. New Fund Total: {formatCurrency(newGearTravelFund)}.
                </p>
              </div>
            </div>
          )}

          {/* Discipline/Category Adjustments */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b pb-1">Category Adjustments:</h3>
            {renderBriefingItems()}
            {categoryBriefings.length === 0 && <p className="text-sm text-gray-500 italic">No category adjustments were necessary.</p>}
          </div>
        </div>

        <Button 
          onClick={onClose} 
          className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg"
        >
          Start New Week
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default MondayBriefingDialog;