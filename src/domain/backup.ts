import { BackupData, Expense, MonthlyBudget, ValidationResult } from './types';
import { validateBackupData } from './validation';
import { getTodayDate } from './dates';

export function createBackupData(budgets: MonthlyBudget[], expenses: Expense[]): BackupData {
  return {
    app: 'Daily Budget',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    budgets,
    expenses,
  };
}

export function generateBackupFilename(dateStr: string = getTodayDate()): string {
  return `daily-budget-backup-${dateStr}.json`;
}

export function generateCsvFilename(monthKey: string): string {
  return `expenses-${monthKey}.csv`;
}

export function expensesToCsv(expenses: Expense[]): string {
  const header = ['ID', 'Date', 'Amount (Rs)', 'Amount (Paisa)', 'Category', 'Description'];
  const rows = expenses.map((e) => {
    const rs = (e.amount / 100).toFixed(2);
    const cat = `"${(e.category ?? '').replace(/"/g, '""')}"`;
    const desc = `"${(e.description ?? '').replace(/"/g, '""')}"`;
    return [e.id, e.date, rs, e.amount, cat, desc].join(',');
  });
  return [header.join(','), ...rows].join('\r\n');
}

export function parseBackupJson(jsonString: string): ValidationResult<BackupData> {
  try {
    const parsed = JSON.parse(jsonString);
    return validateBackupData(parsed);
  } catch (err) {
    return {
      isValid: false,
      error: `Failed to parse JSON file: ${err instanceof Error ? err.message : 'Invalid JSON'}`,
    };
  }
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
