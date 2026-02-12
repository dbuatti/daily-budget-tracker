"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface TokenButtonProps {
  value: number;
  spent: boolean;
  onClick: () => Promise<void> | void;
}

const TokenButton: React.FC<TokenButtonProps> = ({ value, spent, onClick }) => {
  const [isPending, setIsPending] = useState(false);
  const displayValue = formatCurrency(value).replace('A$', '$');

  const handleInternalClick = async () => {
    if (spent || isPending) return;
    setIsPending(true);
    try {
      await onClick();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Button
        onClick={handleInternalClick}
        disabled={spent || isPending}
        className={cn(
          "h-16 w-16 rounded-full font-bold text-lg transition-all duration-200 shadow-lg flex items-center justify-center p-0 relative overflow-hidden",
          
          // Active (Unspent) State
          !spent && !isPending && "bg-indigo-600 text-white hover:bg-indigo-700 border-2 border-indigo-700 dark:bg-indigo-800 dark:hover:bg-indigo-700 dark:border-indigo-600",
          
          // Pending State
          isPending && "bg-indigo-400 text-white cursor-wait border-2 border-indigo-500",
          
          // Spent State
          spent && "bg-gray-200 text-gray-500 hover:bg-gray-200 cursor-not-allowed border-2 border-gray-300 opacity-60 dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600 line-through"
        )}
      >
        {isPending ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          displayValue
        )}
      </Button>
    </motion.div>
  );
};

export default TokenButton;