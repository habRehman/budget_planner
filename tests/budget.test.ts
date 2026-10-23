import { describe, it, expect } from 'vitest';
import { calculateDayBudget } from '../src/domain/budget';
import { MonthlyBudget, Expense } from '../src/domain/types';
import { formatRs } from '../src/domain/money';

describe('budget calculation domain (single source of truth)', () => {
  const baseBudget31Days: MonthlyBudget = {
    month: '2026-01', // January has 31 days
    amount: 2000000, // Rs 20,000 = 2,000,000 paisa
    rule: 'flex',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('Test 1: Rs 20,000, 31 days, flexible, day 1: allowance is 64516 paisa (Rs 645.16)', () => {
    const res = calculateDayBudget(baseBudget31Days, [], '2026-01-01', { today: '2026-01-01' });
    expect(res.allowanceAtStart).toBe(64516);
    expect(formatRs(res.allowanceAtStart)).toBe('Rs 645.16');
    expect(res.availableNow).toBe(64516);
    expect(res.remainingAllowance).toBe(64516);
    expect(res.spentThatDay).toBe(0);
    expect(res.monthSpentTotal).toBe(0);
    expect(res.monthRemaining).toBe(2000000);
    expect(res.daysRemainingInclusive).toBe(31);
    expect(res.isProjection).toBe(false);
  });

  it('Test 2: Spend Rs 400 on day 1: day 2 allowance is Rs 19,600 / 30 = Rs 653.33', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        date: '2026-01-01',
        amount: 40000, // Rs 400 = 40,000 paisa
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
      },
    ];

    const resDay2 = calculateDayBudget(baseBudget31Days, expenses, '2026-01-02', { today: '2026-01-02' });
    // 19,600 * 100 / 30 = 65333.33 -> 65333 paisa
    expect(resDay2.allowanceAtStart).toBe(65333);
    expect(formatRs(resDay2.allowanceAtStart)).toBe('Rs 653.33');
    expect(resDay2.daysRemainingInclusive).toBe(30);
  });

  it('Test 3: Spend Rs 800 on day 1: day 2 allowance is Rs 640.00', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        date: '2026-01-01',
        amount: 80000, // Rs 800 = 80,000 paisa
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
      },
    ];

    const resDay2 = calculateDayBudget(baseBudget31Days, expenses, '2026-01-02', { today: '2026-01-02' });
    // (2,000,000 - 80,000) / 30 = 1,920,000 / 30 = 64,000 paisa = Rs 640.00
    expect(resDay2.allowanceAtStart).toBe(64000);
    expect(formatRs(resDay2.allowanceAtStart)).toBe('Rs 640.00');
    expect(resDay2.daysRemainingInclusive).toBe(30);
  });

  it('Test 4: Fixed rule: allowances across all days of the month sum exactly to the budget; unused money never changes later days', () => {
    const fixedBudget: MonthlyBudget = {
      month: '2026-01',
      amount: 2000000,
      rule: 'fixed',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    let sumAllowances = 0;
    for (let day = 1; day <= 31; day++) {
      const dateStr = `2026-01-${String(day).padStart(2, '0')}`;
      const res = calculateDayBudget(fixedBudget, [], dateStr);
      sumAllowances += res.allowanceAtStart;
    }
    // Fixed allowances must sum exactly to B
    expect(sumAllowances).toBe(2000000);

    // Unused money on day 1 does not change day 2 allowance
    const expDay1: Expense[] = [
      {
        id: 'exp-fixed',
        date: '2026-01-01',
        amount: 10000,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const day2WithoutExp = calculateDayBudget(fixedBudget, [], '2026-01-02');
    const day2WithExp = calculateDayBudget(fixedBudget, expDay1, '2026-01-02');
    expect(day2WithExp.allowanceAtStart).toBe(day2WithoutExp.allowanceAtStart);
  });

  it('Test 5: Fixed rule with budget exhausted but nominal allowance positive: availableNow is 0 and monthOverspend is shown when applicable', () => {
    const fixedBudget: MonthlyBudget = {
      month: '2026-01',
      amount: 100000, // Rs 1,000 = 100,000 paisa
      rule: 'fixed',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    // Day 1: spent 110,000 (Rs 1,100 -> month exhausted by 10,000 paisa)
    const expenses: Expense[] = [
      {
        id: 'exp-big',
        date: '2026-01-01',
        amount: 110000,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const resDay2 = calculateDayBudget(fixedBudget, expenses, '2026-01-02', { today: '2026-01-02' });
    // Nominal allowance is positive
    expect(resDay2.allowanceAtStart).toBeGreaterThan(0);
    // But availableNow must be 0 because month is exhausted
    expect(resDay2.availableNow).toBe(0);
    expect(resDay2.monthRemaining).toBe(-10000);
    expect(resDay2.monthOverspend).toBe(10000);
  });

  it('Test 6: Overspend beyond the monthly budget: monthRemaining is negative, availableNow is 0, no reset', () => {
    const flexBudget: MonthlyBudget = {
      month: '2026-01',
      amount: 50000, // Rs 500
      rule: 'flex',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    // Spent 60000 on day 5
    const expenses: Expense[] = [
      {
        id: 'exp-over',
        date: '2026-01-05',
        amount: 60000,
        createdAt: '2026-01-05T00:00:00.000Z',
        updatedAt: '2026-01-05T00:00:00.000Z',
      },
    ];

    const resDay6 = calculateDayBudget(flexBudget, expenses, '2026-01-06', { today: '2026-01-06' });
    expect(resDay6.allowanceAtStart).toBe(0);
    expect(resDay6.availableNow).toBe(0);
    expect(resDay6.monthRemaining).toBe(-10000);
    expect(resDay6.monthOverspend).toBe(10000);
  });

  it('Test 7: Last day of month reconciles to the exact remaining paisa', () => {
    // Budget 100 paisa across 3 days: Day 1: 33, Day 2: 33, Day 3: 34
    const shortBudget: MonthlyBudget = {
      month: '2026-01',
      amount: 100, // 100 paisa = Rs 1.00
      rule: 'flex',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const expenses: Expense[] = [];
    // Day 1 to 30: simulate spending exactly each day's allowance
    for (let day = 1; day < 31; day++) {
      const dateStr = `2026-01-${String(day).padStart(2, '0')}`;
      const dayCalc = calculateDayBudget(shortBudget, expenses, dateStr);
      expenses.push({
        id: `exp-${day}`,
        date: dateStr,
        amount: dayCalc.allowanceAtStart,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    }

    // Day 31 (last day): allowance must be exactly remaining paisa
    const day31 = calculateDayBudget(shortBudget, expenses, '2026-01-31');
    const spentSoFar = expenses.reduce((s, e) => s + e.amount, 0);
    expect(day31.allowanceAtStart).toBe(100 - spentSoFar);
    expect(spentSoFar + day31.allowanceAtStart).toBe(100);
  });

  it('Test 8: February in leap and non-leap years; 30 and 31 day months', () => {
    // 2024 is a leap year (Feb has 29 days)
    const febLeap: MonthlyBudget = {
      month: '2024-02',
      amount: 29000,
      rule: 'fixed',
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-01T00:00:00.000Z',
    };
    const leapDay29 = calculateDayBudget(febLeap, [], '2024-02-29');
    expect(leapDay29.daysRemainingInclusive).toBe(1);
    expect(leapDay29.allowanceAtStart).toBe(1000);

    // 2025 is non-leap (Feb has 28 days)
    const febNonLeap: MonthlyBudget = {
      month: '2025-02',
      amount: 28000,
      rule: 'fixed',
      createdAt: '2025-02-01T00:00:00.000Z',
      updatedAt: '2025-02-01T00:00:00.000Z',
    };
    const nonLeapDay28 = calculateDayBudget(febNonLeap, [], '2025-02-28');
    expect(nonLeapDay28.daysRemainingInclusive).toBe(1);
    expect(nonLeapDay28.allowanceAtStart).toBe(1000);

    // April has 30 days
    const apr30: MonthlyBudget = {
      month: '2026-04',
      amount: 30000,
      rule: 'flex',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    };
    const aprDay1 = calculateDayBudget(apr30, [], '2026-04-01');
    expect(aprDay1.daysRemainingInclusive).toBe(30);

    // Jan has 31 days
    const janDay1 = calculateDayBudget(baseBudget31Days, [], '2026-01-01');
    expect(janDay1.daysRemainingInclusive).toBe(31);
  });

  it('Test 9: Editing or deleting an old expense changes all later allowances correctly', () => {
    let expenses: Expense[] = [
      {
        id: 'exp-edit',
        date: '2026-01-01',
        amount: 40000, // Rs 400
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
      },
    ];

    const day2Initial = calculateDayBudget(baseBudget31Days, expenses, '2026-01-02');
    expect(day2Initial.allowanceAtStart).toBe(65333); // Rs 653.33

    // Edit expense to Rs 800
    expenses = [
      {
        ...expenses[0]!,
        amount: 80000,
      },
    ];
    const day2AfterEdit = calculateDayBudget(baseBudget31Days, expenses, '2026-01-02');
    expect(day2AfterEdit.allowanceAtStart).toBe(64000); // Rs 640.00

    // Delete expense completely
    expenses = [];
    const day2AfterDelete = calculateDayBudget(baseBudget31Days, expenses, '2026-01-02');
    // (2,000,000 - 0) / 30 = 66666 paisa
    expect(day2AfterDelete.allowanceAtStart).toBe(66666);
  });

  it('Test 10: Future date yields a projection flag; past date ignores expenses after it', () => {
    const today = '2026-01-15';
    const futureDate = '2026-01-20';
    const pastDate = '2026-01-10';

    const expenses: Expense[] = [
      {
        id: 'exp-future',
        date: '2026-01-12', // dated after pastDate, but before futureDate
        amount: 50000,
        createdAt: '2026-01-12T00:00:00.000Z',
        updatedAt: '2026-01-12T00:00:00.000Z',
      },
    ];

    // Future date has projection flag true
    const futureCalc = calculateDayBudget(baseBudget31Days, expenses, futureDate, { today });
    expect(futureCalc.isProjection).toBe(true);

    // Today has projection flag false
    const todayCalc = calculateDayBudget(baseBudget31Days, expenses, today, { today });
    expect(todayCalc.isProjection).toBe(false);

    // Past date has projection flag false
    const pastCalc = calculateDayBudget(baseBudget31Days, expenses, pastDate, { today });
    expect(pastCalc.isProjection).toBe(false);

    // Past date ignores expenses dated 2026-01-12:
    // On day 10, days remaining is 31 - 10 + 1 = 22.
    // spentBefore on day 10 is 0 because expense on day 12 is in the future relative to day 10.
    expect(pastCalc.allowanceAtStart).toBe(Math.floor(2000000 / 22));
  });
});
