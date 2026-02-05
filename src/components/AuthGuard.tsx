import React from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  isProtected: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ isProtected }) => {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (isProtected && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!isProtected && user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AuthGuard;