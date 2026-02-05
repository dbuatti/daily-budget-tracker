import React from 'react';
import { Outlet } from 'react-router-dom';
import MobileNav from './MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <div className="pb-20 md:pb-0"> {/* Add padding for mobile nav */}
        <Outlet />
      </div>
      {isMobile && <MobileNav />}
    </div>
  );
};

export default MainLayout;