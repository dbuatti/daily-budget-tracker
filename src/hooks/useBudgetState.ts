const fetchBudgetState = async (userId: string): Promise<WeeklyBudgetState> => {
  const { data, error } = await supabase
    .from('weekly_budget_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  
  if (data) {
    // Check if current_tokens is empty or missing
    const state = data as WeeklyBudgetState;
    if (!state.current_tokens || state.current_tokens.length === 0) {
      console.log('[fetchBudgetState] Found empty state, returning initialModules instead');
      // Return initial state with proper modules
      return {
        user_id: userId,
        current_tokens: initialModules,
        gear_travel_fund: 0,
        last_reset_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };
    }
    return state;
  }
  
  // Return initial state if no record exists
  return {
    user_id: userId,
    current_tokens: initialModules,
    gear_travel_fund: 0,
    last_reset_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  };
};