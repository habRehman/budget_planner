import { describe, it, expect, beforeEach } from 'vitest';
import { DailyBudgetDatabase } from '../src/data/db';
import { BudgetRepository } from '../src/data/repository';
import { BackupData } from '../src/domain/types';

describe('BudgetRepository (with fake-indexeddb)', () => {
  let db: DailyBudgetDatabase;
  let repo: BudgetRepository;

  beforeEach(async () => {
    // Unique in-memory database name for each test
    const testDbName = `test-db-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    db = new DailyBudgetDatabase(testDbName);
    repo = new BudgetRepository(db);
  });

  it('creates, updates and deletes an expense within transactions', () => {
    return (async () => {
      // 1. Create
      const created = await repo.createExpense({
        date: '2026-10-23',
        amount: 45000,
        description: 'Lunch',
        category: 'Food & Groceries',
      });

      expect(created.id).toBeDefined();
      expect(created.amount).toBe(45000);
      expect(created.date).toBe('2026-10-23');
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();

      // Check stored
      const dateExpenses = await repo.getExpensesByDate('2026-10-23');
      expect(dateExpenses).toHaveLength(1);
      expect(dateExpenses[0]?.id).toBe(created.id);

      // 2. Update
      const updated = await repo.updateExpense(created.id, {
        amount: 50000,
        description: 'Lunch with coffee',
      });

      expect(updated.amount).toBe(50000);
      expect(updated.description).toBe('Lunch with coffee');
      expect(updated.id).toBe(created.id);
      expect(updated.createdAt).toBe(created.createdAt);

      const afterUpdate = await repo.getExpensesByDate('2026-10-23');
      expect(afterUpdate[0]?.amount).toBe(50000);

      // 3. Delete
      await repo.deleteExpense(created.id);
      const afterDelete = await repo.getExpensesByDate('2026-10-23');
      expect(afterDelete).toHaveLength(0);
    })();
  });

  it('queries expenses by date and by month correctly', async () => {
    await repo.createExpense({ date: '2026-10-01', amount: 10000 });
    await repo.createExpense({ date: '2026-10-15', amount: 20000 });
    await repo.createExpense({ date: '2026-10-31', amount: 30000 });
    await repo.createExpense({ date: '2026-11-01', amount: 40000 }); // Different month

    const octExpenses = await repo.getExpensesByMonth('2026-10');
    expect(octExpenses).toHaveLength(3);
    expect(octExpenses.map((e) => e.date)).toEqual(['2026-10-01', '2026-10-15', '2026-10-31']);

    const novExpenses = await repo.getExpensesByMonth('2026-11');
    expect(novExpenses).toHaveLength(1);
    expect(novExpenses[0]?.amount).toBe(40000);
  });

  it('stores and retrieves monthly budgets', async () => {
    const budget = await repo.putBudget({
      month: '2026-10',
      amount: 6000000,
      rule: 'flex',
    });

    expect(budget.month).toBe('2026-10');
    expect(budget.amount).toBe(6000000);
    expect(budget.rule).toBe('flex');

    const fetched = await repo.getBudget('2026-10');
    expect(fetched?.amount).toBe(6000000);

    const list = await repo.listBudgets();
    expect(list).toHaveLength(1);
    expect(list[0]?.month).toBe('2026-10');
  });

  it('performs atomic replace import: clears existing and populates backup', async () => {
    // Add existing
    await repo.putBudget({ month: '2026-09', amount: 3000000, rule: 'fixed' });
    await repo.createExpense({ date: '2026-09-10', amount: 15000 });

    const backupData: BackupData = {
      app: 'Daily Budget',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      budgets: [
        {
          month: '2026-10',
          amount: 5000000,
          rule: 'flex',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      expenses: [
        {
          id: 'exp-import-1',
          date: '2026-10-05',
          amount: 25000,
          createdAt: '2026-10-05T00:00:00.000Z',
          updatedAt: '2026-10-05T00:00:00.000Z',
        },
      ],
    };

    const res = await repo.importData(backupData, 'replace');
    expect(res.importedBudgets).toBe(1);
    expect(res.importedExpenses).toBe(1);

    // September data should be wiped
    const oldBudget = await repo.getBudget('2026-09');
    expect(oldBudget).toBeUndefined();

    // October data present
    const newBudget = await repo.getBudget('2026-10');
    expect(newBudget?.amount).toBe(5000000);
    const newExpenses = await repo.getExpensesByMonth('2026-10');
    expect(newExpenses).toHaveLength(1);
    expect(newExpenses[0]?.id).toBe('exp-import-1');
  });

  it('performs atomic merge import: keeps existing records and skips duplicate IDs', async () => {
    await repo.putBudget({ month: '2026-10', amount: 4000000, rule: 'flex' });
    const existingExp = await repo.createExpense({
      id: 'exp-existing-1',
      date: '2026-10-01',
      amount: 10000,
    });

    const backupData: BackupData = {
      app: 'Daily Budget',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      budgets: [
        {
          month: '2026-10', // duplicate month, should be skipped
          amount: 9999999,
          rule: 'fixed',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
        {
          month: '2026-11', // new month, should be added
          amount: 6000000,
          rule: 'flex',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        },
      ],
      expenses: [
        {
          id: existingExp.id, // duplicate ID, should be skipped
          date: '2026-10-01',
          amount: 888888,
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
        {
          id: 'exp-new-2', // new ID, should be added
          date: '2026-10-02',
          amount: 20000,
          createdAt: '2026-10-02T00:00:00.000Z',
          updatedAt: '2026-10-02T00:00:00.000Z',
        },
      ],
    };

    const res = await repo.importData(backupData, 'merge');
    expect(res.importedBudgets).toBe(1); // Only Nov added
    expect(res.importedExpenses).toBe(1); // Only exp-new-2 added

    // Existing budget remains unchanged
    const octBudget = await repo.getBudget('2026-10');
    expect(octBudget?.amount).toBe(4000000);
    expect(octBudget?.rule).toBe('flex');

    // Existing expense unchanged
    const exp1 = (await repo.getExpensesByDate('2026-10-01'))[0];
    expect(exp1?.amount).toBe(10000);

    // New expense added
    const exp2 = (await repo.getExpensesByDate('2026-10-02'))[0];
    expect(exp2?.amount).toBe(20000);
  });

  it('atomic rollback: invalid backup throws error and leaves existing data untouched', async () => {
    await repo.putBudget({ month: '2026-10', amount: 5000000, rule: 'flex' });
    await repo.createExpense({ date: '2026-10-01', amount: 12000 });

    const corruptedBackup = {
      app: 'Invalid App',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      budgets: [],
      expenses: [],
    } as unknown as BackupData;

    await expect(repo.importData(corruptedBackup, 'replace')).rejects.toThrow();

    // Existing data is 100% intact
    const budget = await repo.getBudget('2026-10');
    expect(budget?.amount).toBe(5000000);
    const expenses = await repo.getExpensesByMonth('2026-10');
    expect(expenses).toHaveLength(1);
  });
});
