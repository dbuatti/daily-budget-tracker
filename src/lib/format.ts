export const formatCurrency = (amount: number): string => {
  // Use Math.abs() for the integer check to handle negative numbers correctly
  const absoluteAmount = Math.abs(amount);
  
  if (absoluteAmount % 1 === 0) {
    // Format as currency without decimal places if the amount is an integer
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } else {
    // Format with two decimal places for non-integer amounts
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
};