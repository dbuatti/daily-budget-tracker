import React from 'react';
import { Outlet } from 'react-router-dom';
import MobileNav from './MobileNav';
import DesktopSidebar from './DesktopSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-background selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="container max-w-6xl mx-auto px-4 py-6 sm:px-8 sm:py-10 pb-24 md:pb-10">
            <Outlet />
          </div>
        </div>
      </main>
      
      {/* Mobile Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
};

export default MainLayout;