import Dexie, { type Table } from 'dexie';
import { MonthlyBudget, Expense } from '../domain/types';

export interface MetaItem {
  key: string;
  value: unknown;
}

export class DailyBudgetDatabase extends Dexie {
  budgets!: Table<MonthlyBudget, string>;
  expenses!: Table<Expense, string>;
  meta!: Table<MetaItem, string>;

  constructor(dbName: string = 'daily-budget') {
    super(dbName);

    // Version 1 schema definition
    this.version(1).stores({
      budgets: 'month',
      expenses: 'id, date, [date+createdAt]',
      meta: 'key',
    });

    // Version migration scaffold:
    // Future schema changes should be chained as:
    // this.version(2).stores({ ... }).upgrade(tx => { ... });
  }
}

export const db = new DailyBudgetDatabase();
