import { Module, Token, Category } from "@/types/budget";

// Helper to create tokens easily
const createTokens = (baseId: string, values: number[]): Token[] =>
  values.map((value, index) => ({
    id: `${baseId}-${index}`,
    value,
    spent: false,
  }));

// Helper to create a category and calculate its base value
const createCategory = (id: string, name: string, tokenValues: number[]): Category => {
    const tokens = createTokens(id, tokenValues);
    const baseValue = tokens.reduce((sum, token) => sum + token.value, 0);
    return { id, name, tokens, baseValue };
};

export const WEEKLY_BUDGET_TOTAL = 649.00;

// --- Generic Spend Constants ---
export const GENERIC_MODULE_ID = "Z";
export const GENERIC_CATEGORY_ID = "Z1";
// -------------------------------

// Fixed costs based on analysis (approx $267.00 total)
export const initialFixedCosts = [
  { name: "Subscriptions", weekly_amount: 47.00 },
  { name: "ATO Buffer", weekly_amount: 42.50 },
  { name: "Bills (Power/Phone)", weekly_amount: 34.00 },
  { name: "Rego/Insurance", weekly_amount: 17.50 },
  // Note: The remaining fixed costs are implicitly covered by the difference
  // between WEEKLY_BUDGET_TOTAL and the sum of active tokens + known fixed costs.
];

export const initialModules: Module[] = [
  {
    id: "A",
    name: "Daily Essentials",
    categories: [
      createCategory("A1", "Groceries", [20, 20, 30]), // $70.00
      createCategory("A2", "Meals Out", [15, 15, 15, 17.5]), // $62.50
      createCategory("A3", "Coffee", [5, 5, 5, 5, 5, 5]), // $30.00
      createCategory("A4", "Drinks / Treats", [3, 3, 4]), // $10.00
    ],
  },
  {
    id: "B",
    name: "Transport & Car",
    categories: [
      createCategory("B1", "Myki / Public Transport", [10, 10]), // $20.00
      createCategory("B2", "Tolls & Parking", [5]), // $5.00
      createCategory("B3", "Fuel", [10, 10]), // $20.00 (Based on $18.15 average)
    ],
  },
  {
    id: "C",
    name: "Home & Misc",
    categories: [
      createCategory("C1", "Household Items", [5, 5, 5, 5, 5]), // $25.00
      createCategory("C2", "Misc Expenses", [10, 10]), // Increased to $20.00 (Based on $15-$20 suggestion)
    ],
  },
  {
    id: "D",
    name: "Health & Wellness",
    categories: [
      createCategory("D1", "Wellbeing/Yoga", [30]), // $30.00
      createCategory("D2", "Medicine/Specialists", [10, 10]), // Increased to $20.00 (Based on $16 average)
    ],
  },
  {
    id: "E",
    name: "Professional & Music",
    categories: [
      createCategory("E1", "Technology", [10, 10, 10, 10]), // $40.00
      createCategory("E2", "Music Specific Gear", [10]), // $10.00
      createCategory("E3", "Gig Prep", [12.5]), // $12.50
    ],
  },
  {
    id: "F",
    name: "Buffers & Fun",
    categories: [
      createCategory("F1", "Shopping", [10, 10]), // $20.00 (Increased from $10)
      createCategory("F2", "Personal Projects", [10]), // $10.00
      createCategory("F3", "Fun & Recreation", [10]), // $10.00
    ],
  },
];

// Calculate the total token budget for display purposes
export const TOTAL_TOKEN_BUDGET = initialModules.reduce((moduleAcc, module) => {
    return moduleAcc + module.categories.reduce((catAcc, category) => {
        return catAcc + category.baseValue;
    }, 0);
}, 0);