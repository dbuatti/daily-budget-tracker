import React from 'react';
import { Outlet } from 'react-router-dom';
import MobileNav from './MobileNav';
import DesktopSidebar from './DesktopSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-background">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="pb-20 md:pb-0"> {/* Add padding for mobile nav */}
          <Outlet />
        </div>
      </main>
      
      {/* Mobile Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
};

export default MainLayout;