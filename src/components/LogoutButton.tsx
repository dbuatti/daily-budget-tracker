import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

const LogoutButton: React.FC = () => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Failed to log out.');
      console.error('Logout error:', error);
    } else {
      showSuccess('Successfully logged out.');
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className="w-full justify-start text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-xl transition-colors"
    >
      <LogOut className="w-5 h-5 mr-3" />
      Sign Out
    </Button>
  );
};

export default LogoutButton;