import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { UserProfile } from '@/types/supabase';

const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, timezone, day_rollover_hour')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  
  if (data) {
    return data as UserProfile;
  }
  return null;
};

export const useUserProfile = () => {
  const { user } = useSession();
  const userId = user?.id;

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
  });

  return { profile, isLoading, isError };
};