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
  isCustom?: boolean;     // To distinguish between core and user-added categories
  tokenValue?: 5 | 10 | 20; // Preferred denomination for token generation
}

export interface Module {
  id: string;
  name: string;
  categories: Category[];
}