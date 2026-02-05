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

export const WEEKLY_BUDGET_TOTAL = 450.00;

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
      createCategory("A1", "Groceries", [20, 20, 30]), // $70.00
      createCategory("A2", "Meals Out", [15, 15, 15]), // $45.00
      createCategory("A3", "Coffee", [5, 5, 5]), // $15.00
      createCategory("A4", "Drinks / Treats", [5]), // $5.00
    ],
  },
  {
    id: "B",
    name: "Transport & Car",
    categories: [
      createCategory("B1", "Myki / Public Transport", [10, 10]), // $20.00
      createCategory("B2", "Tolls & Parking", [5]), // $5.00
    ],
  },
  {
    id: "C",
    name: "Home & Misc",
    categories: [
      createCategory("C1", "Household Items", [5, 5, 5]), // $15.00
      createCategory("C2", "Misc Expenses", [5]), // $5.00
    ],
  },
  {
    id: "D",
    name: "Health & Wellness",
    categories: [
      createCategory("D1", "Wellbeing/Yoga", [30]), // $30.00
      createCategory("D2", "Medicine/Specialists", [10, 10]), // $20.00
    ],
  },
  {
    id: "E",
    name: "Professional & Music",
    categories: [
      createCategory("E1", "Technology/Gear", [10, 10, 10]), // $30.00
      createCategory("E2", "Gig Prep", [10]), // $10.00
    ],
  },
  {
    id: "F",
    name: "Buffers & Fun",
    categories: [
      createCategory("F1", "Shopping/Projects", [10, 10]), // $20.00
      createCategory("F2", "Fun & Recreation", [10]), // $10.00
    ],
  },
  {
    id: "G",
    name: "Long-Term Spends",
    categories: [
      // Fuel is a manual entry category. We give it a base value for weekly tracking, 
      // but it will be handled specially during reset.
      createCategory(FUEL_CATEGORY_ID, "Fuel", [50]), // $50.00 weekly allocation
    ],
  },
];

// Calculate the total token budget (the sum of all token values)
export const TOTAL_TOKEN_BUDGET = initialModules.reduce((moduleAcc, module) => {
    return moduleAcc + module.categories.reduce((catAcc, category) => {
        return catAcc + category.baseValue;
    }, 0);
}, 0);