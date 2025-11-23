
export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER'
}

export enum Category {
  FOOD = 'Food',
  TRANSPORT = 'Transport',
  SHOPPING = 'Shopping',
  HOUSING = 'Housing',
  SALARY = 'Salary',
  INVESTMENT = 'Investment',
  OTHER = 'Other'
}

export const CategoryLabels: Record<string, string> = {
  [Category.FOOD]: '餐饮',
  [Category.TRANSPORT]: '交通',
  [Category.SHOPPING]: '购物',
  [Category.HOUSING]: '居住',
  [Category.SALARY]: '薪资',
  [Category.INVESTMENT]: '投资',
  [Category.OTHER]: '其他'
};

export const TypeLabels: Record<string, string> = {
  [TransactionType.EXPENSE]: '支出',
  [TransactionType.INCOME]: '收入',
  [TransactionType.TRANSFER]: '转账'
};

// Amount is always stored as an integer (cents) to avoid floating point errors
export interface Transaction {
  id: string;
  amount: number; // in cents
  type: TransactionType;
  category: Category | string;
  note: string;
  date: number; // Timestamp
  createdAt: number;
  tags?: string[]; // e.g., '报销', '退款'
}

export interface AssetSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface AppSettings {
  monthlyBudget: number; // in cents
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export type ViewState = 'DASHBOARD' | 'ADD_TRANSACTION' | 'AI_INPUT' | 'STATS' | 'SETTINGS';
