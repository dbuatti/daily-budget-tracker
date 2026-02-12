import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, DollarSign, Zap, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { MadeWithDyad } from '@/components/made-with-dyad';
import LogoutButton from './LogoutButton';
import { ThemeToggle } from './ThemeToggle';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center px-4 py-3 rounded-2xl transition-all duration-300 group relative",
        isActive
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
          : "text-gray-500 hover:bg-indigo-50 dark:text-gray-400 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-300"
      )}
    >
      <div className={cn(
        "mr-3 transition-transform duration-300 group-hover:scale-110",
        isActive ? "text-white" : "text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
      )}>
        {icon}
      </div>
      <span className="font-bold tracking-tight">{label}</span>
      {isActive && (
        <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
      )}
    </Link>
  );
};

const DesktopSidebar: React.FC = () => {
  return (
    <div className="hidden md:flex flex-col w-72 h-screen bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-900 p-6 sticky top-0 z-40">
      
      {/* Logo/Title Area */}
      <div className="flex items-center justify-between mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white">
            Permissions
          </h1>
        </div>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-2 flex-grow">
        <NavItem 
          to="/" 
          label="Log Transaction" 
          icon={<DollarSign className="w-5 h-5" />} 
        />
        <NavItem 
          to="/dashboard" 
          label="Weekly Dashboard" 
          icon={<LayoutDashboard className="w-5 h-5" />} 
        />
        <NavItem 
          to="/transactions" 
          label="History" 
          icon={<History className="w-5 h-5" />} 
        />
      </nav>

      {/* Footer/User Area */}
      <div className="mt-auto pt-6 space-y-4">
        <Separator className="bg-gray-100 dark:bg-gray-800" />
        <div className="px-2">
          <LogoutButton />
        </div>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default DesktopSidebar;