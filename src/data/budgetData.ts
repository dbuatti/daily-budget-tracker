import { Module, Token } from "@/types/budget";

// Helper to create tokens easily
const createTokens = (baseId: string, values: number[]): Token[] =>
  values.map((value, index) => ({
    id: `${baseId}-${index}`,
    value,
    spent: false,
  }));

export const WEEKLY_BUDGET_TOTAL = 649.00;

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
      {
        id: "A1",
        name: "Groceries",
        tokens: createTokens("A1", [20, 20, 30]), // $70.00
      },
      {
        id: "A2",
        name: "Meals Out",
        tokens: createTokens("A2", [15, 15, 15, 17.5]), // $62.50
      },
      {
        id: "A3",
        name: "Coffee",
        tokens: createTokens("A3", [5, 5, 5, 5, 5, 5]), // $30.00
      },
      {
        id: "A4",
        name: "Drinks / Treats",
        tokens: createTokens("A4", [3, 3, 4]), // $10.00
      },
    ],
  },
  {
    id: "B",
    name: "Transport & Car",
    categories: [
      {
        id: "B1",
        name: "Myki / Public Transport",
        tokens: createTokens("B1", [10, 10]), // $20.00
      },
      {
        id: "B2",
        name: "Tolls & Parking",
        tokens: createTokens("B2", [5]), // $5.00
      },
      {
        id: "B3",
        name: "Fuel",
        tokens: createTokens("B3", [10, 10]), // $20.00 (Based on $18.15 average)
      },
    ],
  },
  {
    id: "C",
    name: "Home & Misc",
    categories: [
      {
        id: "C1",
        name: "Household Items",
        tokens: createTokens("C1", [5, 5, 5, 5, 5]), // $25.00
      },
      {
        id: "C2",
        name: "Misc Expenses",
        tokens: createTokens("C2", [10, 10]), // Increased to $20.00 (Based on $15-$20 suggestion)
      },
    ],
  },
  {
    id: "D",
    name: "Health & Wellness",
    categories: [
      {
        id: "D1",
        name: "Wellbeing/Yoga",
        tokens: createTokens("D1", [30]), // $30.00
      },
      {
        id: "D2",
        name: "Medicine/Specialists",
        tokens: createTokens("D2", [10, 10]), // Increased to $20.00 (Based on $16 average)
      },
    ],
  },
  {
    id: "E",
    name: "Professional & Music",
    categories: [
      {
        id: "E1",
        name: "Technology",
        tokens: createTokens("E1", [10, 10, 10, 10]), // $40.00
      },
      {
        id:
        "E2",
        name: "Music Specific Gear",
        tokens: createTokens("E2", [10]), // $10.00
      },
      {
        id: "E3",
        name: "Gig Prep",
        tokens: createTokens("E3", [12.5]), // $12.50
      },
    ],
  },
  {
    id: "F",
    name: "Buffers & Fun",
    categories: [
      {
        id: "F1",
        name: "Shopping",
        tokens: createTokens("F1", [10, 10]), // $20.00 (Increased from $10)
      },
      {
        id: "F2",
        name: "Personal Projects",
        tokens: createTokens("F2", [10]), // $10.00
      },
      {
        id: "F3",
        name: "Fun & Recreation",
        tokens: createTokens("F3", [10]), // $10.00
      },
    ],
  },
];

// Calculate the total token budget for display purposes
export const TOTAL_TOKEN_BUDGET = initialModules.reduce((moduleAcc, module) => {
    return moduleAcc + module.categories.reduce((catAcc, category) => {
        return catAcc + category.tokens.reduce((tokenAcc, token) => tokenAcc + token.value, 0);
    }, 0);
}, 0);