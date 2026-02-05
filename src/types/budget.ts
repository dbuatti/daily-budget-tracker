export interface Token {
  id: string;
  value: number;
  spent: boolean;
}

export interface Category {
  id: string;
  name: string;
  tokens: Token[];
}

export interface Module {
  id: string;
  name: string;
  categories: Category[];
}