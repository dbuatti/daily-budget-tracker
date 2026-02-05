import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, DollarSign, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { MadeWithDyad } from '@/components/made-with-dyad';

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
        "flex items-center p-3 rounded-xl transition-all duration-200 group",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <div className="mr-3">{icon}</div>
      <span className="font-semibold">{label}</span>
    </Link>
  );
};

const DesktopSidebar: React.FC = () => {
  return (
    <div className="hidden md:flex flex-col w-64 h-screen bg-sidebar border-r border-sidebar-border p-4 shadow-2xl sticky top-0">
      
      {/* Logo/Title Area */}
      <div className="flex items-center mb-8 px-2">
        <Zap className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-2" />
        <h1 className="text-xl font-extrabold text-foreground">
          Permissions
        </h1>
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
      </nav>

      {/* Footer/User Area */}
      <Separator className="my-4 bg-sidebar-border" />
      <MadeWithDyad />
    </div>
  );
};

export default DesktopSidebar;