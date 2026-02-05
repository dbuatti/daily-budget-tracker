import { Module, Token } from "@/types/budget";

// Helper to create tokens easily
const createTokens = (baseId: string, values: number[]): Token[] =>
  values.map((value, index) => ({
    id: `${baseId}-${index}`,
    value,
    spent: false,
  }));

export const WEEKLY_BUDGET_TOTAL = 649.00;

export const initialModules: Module[] = [
  {
    id: "A",
    name: "Daily Essentials",
    categories: [
      {
        id: "A1",
        name: "Groceries",
        tokens: createTokens("A1", [20, 20, 30]),
      },
      {
        id: "A2",
        name: "Meals Out",
        tokens: createTokens("A2", [15, 15, 15, 17.5]),
      },
      {
        id: "A3",
        name: "Coffee",
        tokens: createTokens("A3", [5, 5, 5, 5, 5, 5]),
      },
      {
        id: "A4",
        name: "Drinks / Treats",
        tokens: createTokens("A4", [3, 3, 4]),
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
        tokens: createTokens("B1", [10, 10]),
      },
      {
        id: "B2",
        name: "Tolls & Parking",
        tokens: createTokens("B2", [5]),
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
        tokens: createTokens("C1", [5, 5, 5, 5, 5]),
      },
      {
        id: "C2",
        name: "Misc Expenses",
        tokens: createTokens("C2", [7]),
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
        tokens: createTokens("D1", [30]),
      },
      {
        id: "D2",
        name: "Medicine",
        tokens: createTokens("D2", [10]),
      },
      {
        id: "D3",
        name: "Specialists",
        tokens: createTokens("D3", [10]),
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
        tokens: createTokens("E1", [10, 10, 10, 10]),
      },
      {
        id: "E2",
        name: "Music Specific Gear",
        tokens: createTokens("E2", [10]),
      },
      {
        id: "E3",
        name: "Gig Prep",
        tokens: createTokens("E3", [12.5]),
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
        tokens: createTokens("F1", [10, 10]),
      },
      {
        id: "F2",
        name: "Personal Projects",
        tokens: createTokens("F2", [10]),
      },
      {
        id: "F3",
        name: "Fun & Recreation",
        tokens: createTokens("F3", [10]),
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