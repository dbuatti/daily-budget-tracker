import { Module, Token, Category } from "@/types/budget";

export const WEEKS_IN_YEAR = 52.17;

/**
 * Calculates the weekly base value for a category based on annual income and a percentage.
 */
export const calculateBaseValue = (annualIncome: number, percentage: number): number => {
  const weeklyIncome = annualIncome / WEEKS_IN_YEAR;
  const amount = (weeklyIncome * percentage) / 100;
  // Round to nearest 5 for cleaner token distribution, or keep as is? 
  // Let's round to 2 decimal places for accuracy, UI handles the rest.
  return Math.round(amount * 100) / 100;
};

// Helper to create tokens dynamically based on a base value
const generateTokens = (baseId: string, totalValue: number, preferredDenom: number = 10): Token[] => {
  const tokens: Token[] = [];
  let remaining = totalValue;
  let count = 0;

  // Fill with preferred denominations first
  while (remaining >= preferredDenom) {
    tokens.push({
      id: `${baseId}-${count++}`,
      value: preferredDenom,
      spent: false,
    });
    remaining -= preferredDenom;
  }

  // Add the remainder as a final token if it's significant
  if (remaining >= 1) {
    tokens.push({
      id: `${baseId}-${count++}`,
      value: Math.round(remaining * 100) / 100,
      spent: false,
    });
  }

  return tokens;
};

// Updated helper to create a category using dynamic calculation
const createDynamicCategory = (
  id: string, 
  name: string, 
  percentage: number, 
  income: number,
  preferredDenom: 5 | 10 | 20 = 10
): Category => {
  const baseValue = calculateBaseValue(income, percentage);
  const tokens = generateTokens(id, baseValue, preferredDenom);
  return { 
    id, 
    name, 
    tokens, 
    baseValue, 
    percentage,
    tokenValue: preferredDenom 
  };
};

// Default annual income for initial state
export const DEFAULT_ANNUAL_INCOME = 55000;

export const WEEKLY_BUDGET_TOTAL = Math.round((DEFAULT_ANNUAL_INCOME / WEEKS_IN_YEAR) * 100) / 100;

// --- Generic Spend Constants ---
export const GENERIC_MODULE_ID = "Z";
export const GENERIC_CATEGORY_ID = "Z1";
// -------------------------------

// --- Special Category IDs ---
export const FUEL_CATEGORY_ID = "G1";
// ----------------------------

export const initialModules: Module[] = [
  {
    id: "A",
    name: "Daily Essentials",
    categories: [
      createDynamicCategory("A1", "Groceries", 4.7, DEFAULT_ANNUAL_INCOME, 20), 
      createDynamicCategory("A2", "Meals Out", 2.8, DEFAULT_ANNUAL_INCOME, 10),
      createDynamicCategory("A3", "Coffee", 1.4, DEFAULT_ANNUAL_INCOME, 5),
      createDynamicCategory("A4", "Drinks / Treats", 0.5, DEFAULT_ANNUAL_INCOME, 5),
    ],
  },
  {
    id: "B",
    name: "Transport & Car",
    categories: [
      createDynamicCategory("B1", "Myki / Public Transport", 1.9, DEFAULT_ANNUAL_INCOME, 10),
      createDynamicCategory("B2", "Tolls & Parking", 0.5, DEFAULT_ANNUAL_INCOME, 5),
    ],
  },
  {
    id: "C",
    name: "Home & Misc",
    categories: [
      createDynamicCategory("C1", "Household Items", 1.4, DEFAULT_ANNUAL_INCOME, 5),
      createDynamicCategory("C2", "Misc Expenses", 0.5, DEFAULT_ANNUAL_INCOME, 5),
    ],
  },
  {
    id: "D",
    name: "Health & Wellness",
    categories: [
      createDynamicCategory("D1", "Wellbeing/Yoga", 1.9, DEFAULT_ANNUAL_INCOME, 20),
      createDynamicCategory("D2", "Medicine/Specialists", 1.9, DEFAULT_ANNUAL_INCOME, 10),
    ],
  },
  {
    id: "E",
    name: "Professional & Music",
    categories: [
      createDynamicCategory("E1", "Technology/Gear", 1.4, DEFAULT_ANNUAL_INCOME, 10),
      createDynamicCategory("E2", "Gig Prep", 0.9, DEFAULT_ANNUAL_INCOME, 10),
    ],
  },
  {
    id: "F",
    name: "Buffers & Fun",
    categories: [
      createDynamicCategory("F1", "Shopping/Projects", 1.9, DEFAULT_ANNUAL_INCOME, 10),
      createDynamicCategory("F2", "Fun & Recreation", 0.9, DEFAULT_ANNUAL_INCOME, 10),
    ],
  },
  {
    id: "G",
    name: "Long-Term Spends",
    categories: [
      createDynamicCategory(FUEL_CATEGORY_ID, "Fuel", 2.8, DEFAULT_ANNUAL_INCOME, 20),
    ],
  },
];

export const TOTAL_TOKEN_BUDGET = initialModules.reduce((moduleAcc, module) => {
    return moduleAcc + module.categories.reduce((catAcc, category) => {
        return catAcc + category.baseValue;
    }, 0);
}, 0);