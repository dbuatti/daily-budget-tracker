const logTransactionMutation = useMutation({
  mutationFn: async (variables: { amount: number; categoryId?: string; transactionType: 'token_spend' | 'custom_spend' | 'generic_spend' }) => {
    console.log('[logTransactionMutation] Inside mutationFn, calling logTransaction with:', variables);
    const result = await logTransaction(userId!, variables.amount, variables.categoryId, variables.transactionType);
    console.log('[logTransactionMutation] logTransaction completed');
    return result;
  },
  onSuccess: () => {
    console.log('[logTransactionMutation] onSuccess - invalidating spentToday');
    queryClient.invalidateQueries({ queryKey: ['spentToday', userId] });
  },
  onError: (error) => {
    console.error('[logTransactionMutation] onError:', error);
  }
});