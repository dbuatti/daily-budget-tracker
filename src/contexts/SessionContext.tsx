import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update user's timezone if not set, then refetch spentToday
  useEffect(() => {
    const updateUserTimezone = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('id', user.id)
          .single();
        
        if (profile && !profile.timezone) {
          const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const { error } = await supabase
            .from('profiles')
            .update({ timezone: clientTimezone })
            .eq('id', user.id);
          
          if (error) {
            console.error('Failed to update timezone:', error);
          } else {
            console.log(`Updated user ${user.id} timezone to ${clientTimezone}`);
            // Refetch spentToday with correct timezone
            queryClient.invalidateQueries({ queryKey: ['spentToday', user.id] });
          }
        }
      }
    };

    if (user) {
      updateUserTimezone();
    }
  }, [user, queryClient]);

  return (
    <SessionContext.Provider value={{ session, user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};