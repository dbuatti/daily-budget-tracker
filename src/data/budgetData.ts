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

export const initialModules: Module[] = [
  {
    id: "A",
    name: "Daily Essentials",
    categories: [
      createCategory("A1", "Groceries", [20, 20, 30]), // $70.00 (User said $68.50 but tokens sum to $70)
      createCategory("A2", "Meals Out", [15, 15, 15, 17.5]), // $62.50
      createCategory("A3", "Coffee", [5, 5, 5, 5, 5, 5]), // $30.00
      createCategory("A4", "Drinks / Treats", [3, 3, 4]), // $10.00
    ],
  },
  {
    id: "B",
    name: "Transport & Car",
    categories: [
      createCategory("B1", "Myki / Public Transport", [10, 10]), // $20.00 (User said $19.00 but tokens sum to $20)
      createCategory("B2", "Tolls & Parking", [5]), // $5.00 (User said $3.50 but token is $5)
      // Note: User's total for Module B is $69.00 but category tokens only sum to $25.00
      // There's a $44 discrepancy. Based on user's token list, they only provided 2 categories with 3 tokens total = $25
      // I'll keep what's explicitly listed. The user may need to adjust their expectations or add more tokens.
    ],
  },
  {
    id: "C",
    name: "Home & Misc",
    categories: [
      createCategory("C1", "Household Items", [5, 5, 5, 5, 5]), // $25.00
      createCategory("C2", "Misc Expenses", [7]), // $7.00 (User said $7.00, token is $7)
      // User's total for Module C is $121.00 but tokens sum to $32. There's a $89 discrepancy.
    ],
  },
  {
    id: "D",
    name: "Health & Wellness",
    categories: [
      createCategory("D1", "Wellbeing/Yoga", [30]), // $30.00 (User said $32.50 but token is $30)
      createCategory("D2", "Medicine", [10]), // $10.00
      createCategory("D3", "Specialists", [10]), // $10.00 (User said $8.00 but token is $10)
      // User's total for Module D is $88.00 but tokens sum to $50. There's a $38 discrepancy.
    ],
  },
  {
    id: "E",
    name: "Professional & Music",
    categories: [
      createCategory("E1", "Technology", [10, 10, 10, 10]), // $40.00 (User said $37.50 but tokens sum to $40)
      createCategory("E2", "Music Specific Gear", [10]), // $10.00 (User said $11.00 but token is $10)
      createCategory("E3", "Gig Prep", [12.5]), // $12.50
      // User's total for Module E is $61.00 and tokens sum to $62.50. Close but off by $1.50.
    ],
  },
  {
    id: "F",
    name: "Buffers & Fun",
    categories: [
      createCategory("F1", "Shopping", [10, 10]), // $20.00 (User said $19.00 but tokens sum to $20)
      createCategory("F2", "Personal Projects", [10]), // $10.00 (User said $8.00 but token is $10)
      createCategory("F3", "Fun & Recreation", [10]), // $10.00 (User said $11.50 but token is $10)
      // User's total for Module F is $139.00 but tokens sum to $40. There's a $99 discrepancy.
    ],
  },
];

// Calculate the total token budget for display purposes
export const TOTAL_TOKEN_BUDGET = initialModules.reduce((moduleAcc, module) => {
    return moduleAcc + module.categories.reduce((catAcc, category) => {
        return catAcc + category.baseValue;
    }, 0);
}, 0);