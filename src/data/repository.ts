import { DailyBudgetDatabase, db as defaultDb } from './db';
import { Expense, MonthlyBudget, BackupData } from '../domain/types';
import { validateBackupData } from '../domain/validation';
import { createBackupData } from '../domain/backup';

export class BudgetRepository {
  private db: DailyBudgetDatabase;

  constructor(database: DailyBudgetDatabase = defaultDb) {
    this.db = database;
  }

  // --- Expenses ---

  async createExpense(
    data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<Expense> {
    const now = new Date().toISOString();
    const expense: Expense = {
      id: data.id ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      date: data.date,
      amount: data.amount,
      description: data.description,
      category: data.category,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.transaction('rw', this.db.expenses, async () => {
      await this.db.expenses.add(expense);
    });

    // Request persistent storage after first expense is saved
    void this.requestPersistentStorage();

    return expense;
  }

  async updateExpense(
    id: string,
    updates: Partial<Omit<Expense, 'id' | 'createdAt'>>
  ): Promise<Expense> {
    return await this.db.transaction('rw', this.db.expenses, async () => {
      const existing = await this.db.expenses.get(id);
      if (!existing) {
        throw new Error(`Expense with ID ${id} not found.`);
      }

      const updated: Expense = {
        ...existing,
        ...updates,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await this.db.expenses.put(updated);
      return updated;
    });
  }

  async deleteExpense(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.expenses, async () => {
      await this.db.expenses.delete(id);
    });
  }

  async getExpensesByDate(date: string): Promise<Expense[]> {
    return await this.db.expenses.where('date').equals(date).sortBy('createdAt');
  }

  async getExpensesByMonth(monthKey: string): Promise<Expense[]> {
    const start = `${monthKey}-01`;
    const end = `${monthKey}-31`;
    const items = await this.db.expenses.where('date').between(start, end, true, true).toArray();
    // Sort by date ascending, then createdAt ascending
    return items.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await this.db.expenses.toArray();
  }

  // --- Budgets ---

  async getBudget(monthKey: string): Promise<MonthlyBudget | undefined> {
    return await this.db.budgets.get(monthKey);
  }

  async putBudget(
    budgetData: Omit<MonthlyBudget, 'createdAt' | 'updatedAt'> & { createdAt?: string }
  ): Promise<MonthlyBudget> {
    return await this.db.transaction('rw', this.db.budgets, async () => {
      const existing = await this.db.budgets.get(budgetData.month);
      const now = new Date().toISOString();

      const budget: MonthlyBudget = {
        month: budgetData.month,
        amount: budgetData.amount,
        rule: budgetData.rule,
        createdAt: existing?.createdAt ?? budgetData.createdAt ?? now,
        updatedAt: now,
      };

      await this.db.budgets.put(budget);
      return budget;
    });
  }

  async listBudgets(): Promise<MonthlyBudget[]> {
    const budgets = await this.db.budgets.toArray();
    return budgets.sort((a, b) => b.month.localeCompare(a.month));
  }

  // --- Meta & Persistent Storage ---

  async getMeta<T = unknown>(key: string): Promise<T | undefined> {
    const item = await this.db.meta.get(key);
    return item ? (item.value as T) : undefined;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    await this.db.meta.put({ key, value });
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const persisted = await navigator.storage.persist();
        await this.setMeta('storagePersisted', persisted);
        return persisted;
      } catch {
        return false;
      }
    }
    return false;
  }

  async isStoragePersisted(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      try {
        return await navigator.storage.persisted();
      } catch {
        return false;
      }
    }
    return false;
  }

  // --- Export, Import, Reset ---

  async exportAllData(): Promise<BackupData> {
    const budgets = await this.db.budgets.toArray();
    const expenses = await this.db.expenses.toArray();
    return createBackupData(budgets, expenses);
  }

  /**
   * Imports backup data atomically in a single transaction.
   * If any error occurs or file is invalid, existing data remains completely untouched.
   */
  async importData(
    backup: BackupData,
    mode: 'merge' | 'replace'
  ): Promise<{ importedBudgets: number; importedExpenses: number }> {
    // Validate backup schema before beginning transaction
    const validation = validateBackupData(backup);
    if (!validation.isValid || !validation.data) {
      throw new Error(validation.error ?? 'Invalid backup payload.');
    }

    const { budgets, expenses } = validation.data;

    return await this.db.transaction('rw', [this.db.budgets, this.db.expenses], async () => {
      if (mode === 'replace') {
        await this.db.budgets.clear();
        await this.db.expenses.clear();
        await this.db.budgets.bulkAdd(budgets);
        await this.db.expenses.bulkAdd(expenses);
        return {
          importedBudgets: budgets.length,
          importedExpenses: expenses.length,
        };
      }

      // Merge mode: keep existing records, skip duplicates
      const existingBudgets = await this.db.budgets.toArray();
      const existingMonths = new Set(existingBudgets.map((b) => b.month));
      const budgetsToAdd = budgets.filter((b) => !existingMonths.has(b.month));

      const existingExpenses = await this.db.expenses.toArray();
      const existingIds = new Set(existingExpenses.map((e) => e.id));
      const expensesToAdd = expenses.filter((e) => !existingIds.has(e.id));

      if (budgetsToAdd.length > 0) {
        await this.db.budgets.bulkAdd(budgetsToAdd);
      }
      if (expensesToAdd.length > 0) {
        await this.db.expenses.bulkAdd(expensesToAdd);
      }

      return {
        importedBudgets: budgetsToAdd.length,
        importedExpenses: expensesToAdd.length,
      };
    });
  }

  async clearAllData(): Promise<void> {
    await this.db.transaction('rw', [this.db.budgets, this.db.expenses], async () => {
      await this.db.budgets.clear();
      await this.db.expenses.clear();
    });
  }
}

export const repository = new BudgetRepository(defaultDb);
