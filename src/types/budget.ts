export interface Token {
  id: string;
  value: number;
  spent: boolean;
}

export interface Category {
  id: string;
  name: string;
  tokens: Token[];
  baseValue: number; // New field: The original weekly budget for this category
}

export interface Module {
  id: string;
  name: string;
  categories: Category[];
}