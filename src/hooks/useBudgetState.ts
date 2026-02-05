// ... (previous code remains the same until the return statement)

  return {
    modules,
    gearTravelFund,
    totalSpent: totalSpentWeekly,
    spentToday: spentToday || 0,
    isLoading,
    isError,
    handleTokenSpend,
    handleCustomSpend,
    handleGenericSpend,
    handleFundAdjustment,
    handleMondayReset,
    handleFullReset,
    refetchSpentToday,
    resetBriefing: briefingData,
    clearBriefing,
    state, // Add raw state for debugging
  };
};