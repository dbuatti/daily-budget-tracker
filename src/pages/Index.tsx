import { MadeWithDyad } from "@/components/made-with-dyad";
import WeeklyDashboard from "@/components/WeeklyDashboard";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <WeeklyDashboard />
      <MadeWithDyad />
    </div>
  );
};

export default Index;