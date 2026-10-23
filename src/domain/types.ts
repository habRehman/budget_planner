export type BudgetRule = 'flex' | 'fixed';

export interface MonthlyBudget {
  month: string; // YYYY-MM
  amount: number; // integer paisa (Rs 1 = 100 paisa)
  rule: BudgetRule;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface Expense {
  id: string; // crypto.randomUUID()
  date: string; // YYYY-MM-DD
  amount: number; // integer paisa
  description?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayBudget {
  allowanceAtStart: number; // in paisa
  spentThatDay: number; // in paisa
  remainingAllowance: number; // allowanceAtStart - spentThatDay (can be negative)
  overspendToday: number; // max(0, -remainingAllowance)
  availableNow: number; // max(0, min(remainingAllowance, B - spentBefore - spentToday)), never negative
  monthSpentTotal: number; // total spent across entire month
  monthRemaining: number; // B - monthSpentTotal (can be negative)
  monthOverspend: number; // max(0, -monthRemaining)
  isProjection: boolean;
  daysRemainingInclusive: number; // D - d + 1
}

export interface BackupData {
  app: 'Daily Budget';
  schemaVersion: 1;
  exportedAt: string;
  budgets: MonthlyBudget[];
  expenses: Expense[];
}

export interface ValidationResult<T = void> {
  isValid: boolean;
  error?: string;
  data?: T;
}
