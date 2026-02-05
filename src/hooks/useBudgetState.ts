// ... find the handleTokenSpend function and add more logging:

  const handleTokenSpend = useCallback(async (categoryId: string, tokenId: string) => {
    console.log('[useBudgetState] handleTokenSpend CALLED with:', { categoryId, tokenId });
    
    try {
      // Find the category and token
      let categoryFound = false;
      let tokenFound = false;
      let amount = 0;

      console.log('[useBudgetState] Current modules structure:', JSON.stringify(modules, null, 2));

      const updatedModules = modules.map(module => ({
        ...module,
        categories: module.categories.map(category => {
          if (category.id === categoryId) {
            categoryFound = true;
            console.log('[useBudgetState] Found category:', category.name);
            const updatedTokens = category.tokens.map(token => {
              if (token.id === tokenId) {
                tokenFound = true;
                amount = token.value;
                console.log('[useBudgetState] Found token, value:', token.value, 'spent:', token.spent);
                return { ...token, spent: true };
              }
              return token;
            });
            return { ...category, tokens: updatedTokens };
          }
          return category;
        })
      }));

      if (!categoryFound || !tokenFound) {
        console.error('[useBudgetState] Category or token not found!', { categoryFound, tokenFound, categoryId, tokenId });
        throw new Error('Category or token not found');
      }

      console.log('[useBudgetState] About to log transaction with amount:', amount);
      
      // Log the transaction
      console.log('[useBudgetState] Calling logTransactionMutation.mutateAsync...');
      await logTransactionMutation.mutateAsync({ amount, categoryId, transactionType: 'token_spend' });
      console.log('[useBudgetState] Transaction logged successfully');

      console.log('[useBudgetState] About to save state with updated modules');
      
      // Save updated state
      await saveMutation.mutateAsync({ modules: updatedModules, gearTravelFund });

      console.log('[useBudgetState] State saved successfully');
      toast.success(`Logged ${formatCurrency(amount)}`);
    } catch (error) {
      console.error('[useBudgetState] Error in handleTokenSpend:', error);
      toast.error('Failed to log transaction');
    }
  }, [modules, gearTravelFund, logTransactionMutation, saveMutation]);