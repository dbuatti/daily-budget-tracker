import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, DollarSign, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive }) => (
  <Link
    to={to}
    className={cn(
      "flex flex-col items-center justify-center p-2 transition-colors duration-200 rounded-xl",
      isActive
        ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-800"
        : "text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
    )}
  >
    {icon}
    <span className="text-xs mt-1 font-medium">{label}</span>
  </Link>
);

const MobileNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    {
      to: '/',
      label: 'Log',
      icon: <DollarSign className="w-6 h-6" />,
      isActive: location.pathname === '/',
    },
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-6 h-6" />,
      isActive: location.pathname === '/dashboard',
    },
    {
      to: '/transactions',
      label: 'History',
      icon: <History className="w-6 h-6" />,
      isActive: location.pathname === '/transactions',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl p-2">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileNav;