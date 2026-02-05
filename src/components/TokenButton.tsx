import React from 'react';
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TokenButtonProps {
  value: number;
  spent: boolean;
  onClick: () => void;
}

const TokenButton: React.FC<TokenButtonProps> = ({ value, spent, onClick }) => {
  const displayValue = formatCurrency(value).replace('A$', '$');

  return (
    <Button
      onClick={onClick}
      disabled={spent}
      className={cn(
        // Increased size and made circular for easy tapping
        "h-16 w-16 rounded-full font-bold text-lg transition-all duration-200 shadow-lg flex items-center justify-center p-0",
        spent
          ? "bg-gray-300 text-gray-500 hover:bg-gray-300 cursor-not-allowed border-2 border-gray-400"
          : "bg-indigo-600 text-white hover:bg-indigo-700 border-2 border-indigo-700 active:scale-[0.98]",
        "dark:shadow-none dark:border-2",
        spent && "dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600",
        !spent && "dark:bg-indigo-800 dark:hover:bg-indigo-700 dark:border-indigo-600"
      )}
    >
      {displayValue}
    </Button>
  );
};

export default TokenButton;