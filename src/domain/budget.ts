/**
 * The single source of truth for all budget calculations.
 * All formulas live only in this file. React components must never contain budget math.
 */

import { MonthlyBudget, Expense, DayBudget } from './types';
import {
  parseDateString,
  getDaysInMonth,
  getTodayDate,
  getMonthKey,
} from './dates';

export interface BudgetCalculationOptions {
  today?: string; // Optional reference date for projection checks (defaults to local today)
}

/**
 * Calculates the DayBudget for a given target date.
 * Deterministic and based strictly on integer paisa.
 */
export function calculateDayBudget(
  budget: MonthlyBudget,
  expenses: Expense[],
  targetDate: string,
  options: BudgetCalculationOptions = {}
): DayBudget {
  const today = options.today ?? getTodayDate();
  const { year, month, day: d } = parseDateString(targetDate);
  const D = getDaysInMonth(year, month);
  const B = budget.amount;

  const monthKey = budget.month;
  // Filter expenses strictly to the month of the target date
  const monthExpenses = expenses.filter((e) => getMonthKey(e.date) === monthKey);

  // Sum of expenses dated strictly before targetDate
  let spentBefore = 0;
  // Sum of expenses on targetDate
  let spentToday = 0;
  // Sum of all expenses in the month
  let monthSpentTotal = 0;

  for (const exp of monthExpenses) {
    monthSpentTotal += exp.amount;
    if (exp.date < targetDate) {
      spentBefore += exp.amount;
    } else if (exp.date === targetDate) {
      spentToday += exp.amount;
    }
  }

  const daysRemainingInclusive = D - d + 1;

  let allowanceAtStart = 0;

  if (budget.rule === 'flex') {
    // Flexible rule:
    // allowanceAtStart = max(0, floor((B - spentBefore) / (D - d + 1)))
    // On the last day divisor is 1, reconciling all remaining paisa without rounding loss
    const remainingBudgetBeforeToday = B - spentBefore;
    if (daysRemainingInclusive > 0) {
      allowanceAtStart = Math.max(0, Math.floor(remainingBudgetBeforeToday / daysRemainingInclusive));
    }
  } else {
    // Fixed rule:
    // base = floor(B / D) and first (B % D) days get +1 paisa.
    // Sum across all days d=1..D sums exactly to B.
    // Unused money does not carry and overspend does not reduce nominal allowance.
    const base = Math.floor(B / D);
    const remainder = B % D;
    allowanceAtStart = base + (d <= remainder ? 1 : 0);
  }

  const remainingAllowance = allowanceAtStart - spentToday;
  const overspendToday = Math.max(0, -remainingAllowance);

  // availableNow:
  // Ensures with the fixed rule a positive nominal allowance is never shown as available
  // once the monthly budget is exhausted. Never negative.
  const remainingMonthAtStartOfToday = B - spentBefore - spentToday;
  const availableNow = Math.max(0, Math.min(remainingAllowance, remainingMonthAtStartOfToday));

  const monthRemaining = B - monthSpentTotal;
  const monthOverspend = Math.max(0, -monthRemaining);

  const isProjection = targetDate > today;

  return {
    allowanceAtStart,
    spentThatDay: spentToday,
    remainingAllowance,
    overspendToday,
    availableNow,
    monthSpentTotal,
    monthRemaining,
    monthOverspend,
    isProjection,
    daysRemainingInclusive,
  };
}

/**
 * Returns month-level summary metrics.
 */
export function calculateMonthSummary(
  budget: MonthlyBudget,
  expenses: Expense[],
  referenceDate: string = getTodayDate()
) {
  const { year, month } = parseDateString(referenceDate);
  const D = getDaysInMonth(year, month);
  const B = budget.amount;

  const monthExpenses = expenses.filter((e) => getMonthKey(e.date) === budget.month);
  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthRemaining = B - totalSpent;
  const monthOverspend = Math.max(0, -monthRemaining);

  // Reference day number
  const isCurrentMonth = getMonthKey(referenceDate) === budget.month;
  const targetDay = isCurrentMonth ? parseDateString(referenceDate).day : D;
  
  // Days elapsed in the month so far
  const daysElapsed = Math.min(D, Math.max(1, targetDay));
  const averageDailySpendSoFar = Math.round(totalSpent / daysElapsed);
  const daysLeft = Math.max(0, D - targetDay);

  const percentageUsed = B > 0 ? Math.min(100, Math.round((totalSpent / B) * 100)) : 0;

  return {
    month: budget.month,
    budgetAmount: B,
    totalSpent,
    monthRemaining,
    monthOverspend,
    percentageUsed,
    daysElapsed,
    daysLeft,
    daysInMonth: D,
    averageDailySpendSoFar,
  };
}
