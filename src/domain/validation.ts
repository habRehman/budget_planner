import { MonthlyBudget, Expense, BudgetRule, BackupData, ValidationResult } from './types';
import { parseRupees } from './money';
import { isValidDateString, isValidMonthKey } from './dates';

export const ALLOWED_CATEGORIES = [
  'Food & Groceries',
  'Transport & Fuel',
  'Utilities & Bills',
  'Shopping',
  'Health & Medical',
  'Entertainment',
  'Other'
] as const;

export type ExpenseCategory = typeof ALLOWED_CATEGORIES[number];

export function validateExpenseInput(input: {
  amount: string | number;
  date: string;
  description?: string;
  category?: string;
}): ValidationResult<{ amount: number; date: string; description?: string; category?: string }> {
  let paisa: number | null = null;
  if (typeof input.amount === 'number') {
    if (Number.isInteger(input.amount) && input.amount > 0 && input.amount <= 99999999900) {
      paisa = input.amount;
    }
  } else {
    paisa = parseRupees(input.amount);
  }

  if (paisa === null || paisa <= 0) {
    return { isValid: false, error: 'Please enter a valid positive amount in Rupees (e.g. 450 or 1,250.50).' };
  }

  if (!isValidDateString(input.date)) {
    return { isValid: false, error: 'Please enter a valid calendar date (YYYY-MM-DD).' };
  }

  const trimmedDesc = input.description?.trim();
  if (trimmedDesc && trimmedDesc.length > 200) {
    return { isValid: false, error: 'Description must not exceed 200 characters.' };
  }

  return {
    isValid: true,
    data: {
      amount: paisa,
      date: input.date,
      description: trimmedDesc || undefined,
      category: input.category?.trim() || undefined,
    },
  };
}

export function validateBudgetInput(input: {
  month: string;
  amount: string | number;
  rule: string;
}): ValidationResult<{ month: string; amount: number; rule: BudgetRule }> {
  if (!isValidMonthKey(input.month)) {
    return { isValid: false, error: 'Please enter a valid month (YYYY-MM).' };
  }

  let paisa: number | null = null;
  if (typeof input.amount === 'number') {
    if (Number.isInteger(input.amount) && input.amount > 0 && input.amount <= 99999999900) {
      paisa = input.amount;
    }
  } else {
    paisa = parseRupees(input.amount);
  }

  if (paisa === null || paisa <= 0) {
    return { isValid: false, error: 'Please enter a valid positive monthly budget amount.' };
  }

  if (input.rule !== 'flex' && input.rule !== 'fixed') {
    return { isValid: false, error: 'Rule must be either flexible or fixed.' };
  }

  return {
    isValid: true,
    data: {
      month: input.month,
      amount: paisa,
      rule: input.rule as BudgetRule,
    },
  };
}

/**
 * Validates imported backup JSON.
 * Rejects invalid structure, malformed schema, wrong versions, duplicate IDs,
 * negative amounts, or invalid dates.
 */
export function validateBackupData(data: unknown): ValidationResult<BackupData> {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid backup file: content is not a JSON object.' };
  }

  const obj = data as Record<string, unknown>;

  if (obj['app'] !== 'Daily Budget') {
    return { isValid: false, error: 'Invalid backup file: unrecognized app identifier.' };
  }

  if (obj['schemaVersion'] !== 1) {
    return { isValid: false, error: 'Unsupported backup version. Expected version 1.' };
  }

  if (!Array.isArray(obj['budgets'])) {
    return { isValid: false, error: 'Malformed backup: "budgets" must be an array.' };
  }

  if (!Array.isArray(obj['expenses'])) {
    return { isValid: false, error: 'Malformed backup: "expenses" must be an array.' };
  }

  const seenMonths = new Set<string>();
  const validatedBudgets: MonthlyBudget[] = [];

  for (const b of obj['budgets']) {
    if (!b || typeof b !== 'object') {
      return { isValid: false, error: 'Malformed budget record in backup.' };
    }
    const bObj = b as Record<string, unknown>;
    if (typeof bObj['month'] !== 'string' || !isValidMonthKey(bObj['month'])) {
      return { isValid: false, error: `Invalid month key in budget: ${String(bObj['month'])}` };
    }
    if (seenMonths.has(bObj['month'])) {
      return { isValid: false, error: `Duplicate budget for month: ${bObj['month']}` };
    }
    seenMonths.add(bObj['month']);

    if (typeof bObj['amount'] !== 'number' || !Number.isInteger(bObj['amount']) || bObj['amount'] <= 0) {
      return { isValid: false, error: `Budget for ${bObj['month']} has an invalid or negative amount.` };
    }

    if (bObj['rule'] !== 'flex' && bObj['rule'] !== 'fixed') {
      return { isValid: false, error: `Budget for ${bObj['month']} has an invalid rule.` };
    }

    validatedBudgets.push({
      month: bObj['month'],
      amount: bObj['amount'],
      rule: bObj['rule'],
      createdAt: typeof bObj['createdAt'] === 'string' ? bObj['createdAt'] : new Date().toISOString(),
      updatedAt: typeof bObj['updatedAt'] === 'string' ? bObj['updatedAt'] : new Date().toISOString(),
    });
  }

  const seenExpenseIds = new Set<string>();
  const validatedExpenses: Expense[] = [];

  for (const e of obj['expenses']) {
    if (!e || typeof e !== 'object') {
      return { isValid: false, error: 'Malformed expense record in backup.' };
    }
    const eObj = e as Record<string, unknown>;
    if (typeof eObj['id'] !== 'string' || !eObj['id'].trim()) {
      return { isValid: false, error: 'Expense record missing valid id.' };
    }
    if (seenExpenseIds.has(eObj['id'])) {
      return { isValid: false, error: `Duplicate expense ID detected: ${eObj['id']}` };
    }
    seenExpenseIds.add(eObj['id']);

    if (typeof eObj['date'] !== 'string' || !isValidDateString(eObj['date'])) {
      return { isValid: false, error: `Invalid date on expense ${eObj['id']}: ${String(eObj['date'])}` };
    }

    if (typeof eObj['amount'] !== 'number' || !Number.isInteger(eObj['amount']) || eObj['amount'] <= 0) {
      return { isValid: false, error: `Expense ${eObj['id']} has invalid or negative amount.` };
    }

    validatedExpenses.push({
      id: eObj['id'],
      date: eObj['date'],
      amount: eObj['amount'],
      description: typeof eObj['description'] === 'string' ? eObj['description'] : undefined,
      category: typeof eObj['category'] === 'string' ? eObj['category'] : undefined,
      createdAt: typeof eObj['createdAt'] === 'string' ? eObj['createdAt'] : new Date().toISOString(),
      updatedAt: typeof eObj['updatedAt'] === 'string' ? eObj['updatedAt'] : new Date().toISOString(),
    });
  }

  return {
    isValid: true,
    data: {
      app: 'Daily Budget',
      schemaVersion: 1,
      exportedAt: typeof obj['exportedAt'] === 'string' ? obj['exportedAt'] : new Date().toISOString(),
      budgets: validatedBudgets,
      expenses: validatedExpenses,
    },
  };
}
