import { describe, it, expect } from 'vitest';
import { validateBackupData } from '../src/domain/validation';
import {
  createBackupData,
  parseBackupJson,
  expensesToCsv,
  generateBackupFilename,
} from '../src/domain/backup';
import { MonthlyBudget, Expense } from '../src/domain/types';

describe('backup domain utility', () => {
  const sampleBudgets: MonthlyBudget[] = [
    {
      month: '2026-10',
      amount: 5000000,
      rule: 'flex',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ];

  const sampleExpenses: Expense[] = [
    {
      id: 'exp-1',
      date: '2026-10-23',
      amount: 45000,
      description: 'Lunch',
      category: 'Food & Groceries',
      createdAt: '2026-10-23T12:00:00.000Z',
      updatedAt: '2026-10-23T12:00:00.000Z',
    },
    {
      id: 'exp-2',
      date: '2026-10-23',
      amount: 15000,
      description: 'Fuel',
      category: 'Transport & Fuel',
      createdAt: '2026-10-23T14:00:00.000Z',
      updatedAt: '2026-10-23T14:00:00.000Z',
    },
  ];

  it('validates a valid backup successfully', () => {
    const backup = createBackupData(sampleBudgets, sampleExpenses);
    const result = validateBackupData(backup);
    expect(result.isValid).toBe(true);
    expect(result.data?.budgets).toHaveLength(1);
    expect(result.data?.expenses).toHaveLength(2);
  });

  it('rejects malformed backup structure or wrong app identifier', () => {
    expect(validateBackupData(null).isValid).toBe(false);
    expect(validateBackupData('plain string').isValid).toBe(false);
    expect(validateBackupData({ app: 'Other App', schemaVersion: 1 }).isValid).toBe(false);
  });

  it('rejects wrong schema version', () => {
    const backup = {
      app: 'Daily Budget',
      schemaVersion: 2, // unsupported
      exportedAt: new Date().toISOString(),
      budgets: sampleBudgets,
      expenses: sampleExpenses,
    };
    const res = validateBackupData(backup);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Unsupported backup version');
  });

  it('rejects duplicate expense IDs', () => {
    const duplicateExpenses = [
      ...sampleExpenses,
      {
        id: 'exp-1', // duplicate ID!
        date: '2026-10-24',
        amount: 20000,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
    ];
    const backup = {
      app: 'Daily Budget',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      budgets: sampleBudgets,
      expenses: duplicateExpenses,
    };
    const res = validateBackupData(backup);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Duplicate expense ID');
  });

  it('rejects negative amounts in budgets or expenses', () => {
    const negativeBudget = {
      app: 'Daily Budget',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      budgets: [{ ...sampleBudgets[0]!, amount: -5000 }],
      expenses: sampleExpenses,
    };
    expect(validateBackupData(negativeBudget).isValid).toBe(false);

    const negativeExpense = {
      app: 'Daily Budget',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      budgets: sampleBudgets,
      expenses: [{ ...sampleExpenses[0]!, amount: -100 }],
    };
    expect(validateBackupData(negativeExpense).isValid).toBe(false);
  });

  it('generates proper backup filenames and CSV', () => {
    expect(generateBackupFilename('2026-10-23')).toBe('daily-budget-backup-2026-10-23.json');

    const csv = expensesToCsv(sampleExpenses);
    expect(csv).toContain('ID,Date,Amount (Rs),Amount (Paisa),Category,Description');
    expect(csv).toContain('450.00');
    expect(csv).toContain('"Food & Groceries"');
    expect(csv).toContain('"Lunch"');
  });

  it('parseBackupJson handles valid and corrupt JSON strings', () => {
    const backup = createBackupData(sampleBudgets, sampleExpenses);
    const jsonStr = JSON.stringify(backup);
    const parsedValid = parseBackupJson(jsonStr);
    expect(parsedValid.isValid).toBe(true);

    const parsedCorrupt = parseBackupJson('{ corrupted json');
    expect(parsedCorrupt.isValid).toBe(false);
    expect(parsedCorrupt.error).toContain('Failed to parse JSON');
  });
});
