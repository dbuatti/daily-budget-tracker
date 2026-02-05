// ... (previous code remains the same until the fetchSpentToday function)

const fetchSpentToday = async (userId: string): Promise<number> => {
  console.log('[useBudgetState] fetchSpentToday called for user:', userId);
  console.log('[useBudgetState] Calling Supabase RPC get_daily_spent_amount...');
  
  try {
    const { data, error } = await supabase.rpc('get_daily_spent_amount', { p_user_id: userId });

    if (error) {
      console.error('[useBudgetState] Error from get_daily_spent_amount RPC:', error);
      throw new Error(error.message);
    }
    
    const numericData = parseFloat(data as string) || 0;
    console.log('[useBudgetState] RPC returned raw data:', data, 'parsed to:', numericData);
    return numericData;
  } catch (err) {
    console.error('[useBudgetState] Exception in fetchSpentToday:', err);
    throw err;
  }
};

// ... (rest of the file remains the same until the useBudgetState hook return)

export const useBudgetState = () => {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Fetch initial weekly state
  const { data: dbState, isLoading: isLoadingWeekly, isError: isErrorWeekly } = useQuery({
    queryKey: [WEEKLY_STATE_TABLE, userId],
    queryFn: () => fetchBudgetState(userId!),
    enabled: !!userId,
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      return true;
    }
  });
  
  // Fetch daily spent amount
  const { data: spentToday = 0, isLoading: isLoadingDaily, isError: isErrorDaily, refetch: refetchDailySpent } = useQuery({
    queryKey: ['spentToday', userId],
    queryFn: () => fetchSpentToday(userId!),
    enabled: !!userId,
    initialData: 0,
  });

  // Log whenever spentToday changes
  useEffect(() => {
    console.log('[useBudgetState] spentToday updated:', spentToday, 'isLoading:', isLoadingDaily, 'isError:', isErrorDaily);
  }, [spentToday, isLoadingDaily, isErrorDaily]);

  // ... (rest of the hook remains the same)
  
  return {
    modules,
    gearTravelFund,
    totalSpent: totalSpentWeekly, // Total spent this week
    spentToday, // Total spent today (new)
    isLoading: isLoading || saveMutation.isPending || logTransactionMutation.isPending,
    isError,
    resetBriefing,
    clearBriefing,
    handleTokenSpend,
    handleGenericSpend,
    handleCustomSpend,
    handleMondayReset,
    handleFundAdjustment,
    handleFullReset,
  };
};