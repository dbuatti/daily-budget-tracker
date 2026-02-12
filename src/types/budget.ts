export interface Token {
  id: string;
  value: number;
  spent: boolean;
}

export interface UserBudgetConfig {
  annualIncome: number;
  calculationMode: 'fixed' | 'percentage';
  payFrequency: 'weekly' | 'fortnightly';
  taxRate?: number;
}

export interface Category {
  id: string;
  name: string;
  tokens: Token[];
  baseValue: number;      // The actual $ amount for the week
  percentage?: number;    // The % of weekly income if in percentage mode
  mode?: 'fixed' | 'percentage'; // Per-category mode
  frequency?: 'weekly' | 'monthly'; // 'monthly' triggers the 4-week spread
  totalMonthlyAmount?: number;    // The full amount for monthly categories
  isCustom?: boolean;     // To distinguish between core and user-added categories
  tokenValue?: 5 | 10 | 20; // Preferred denomination for token generation
  iconName?: string;      // Lucide icon name
}

export interface Module {
  id: string;
  name: string;
  categories: Category[];
}