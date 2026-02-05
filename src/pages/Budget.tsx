import React from 'react';
import WeeklyDashboard from "@/components/WeeklyDashboard";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Budget = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <WeeklyDashboard />
      <MadeWithDyad />
    </div>
  );
};

export default Budget;