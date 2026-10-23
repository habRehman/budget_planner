import React from 'react';
import { Expense, MonthlyBudget, DayBudget } from '../domain/types';
import { calculateDayBudget } from '../domain/budget';
import { formatRs } from '../domain/money';
import {
  formatMonthLabel,
  getPrevMonth,
  getNextMonth,
  getCurrentMonthKey,
  getDaysInMonthKey,
  getWeekdayLabel,
  getTodayDate,
} from '../domain/dates';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Sparkles, ChevronRight as ArrowIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface HistoryProps {
  currentMonth: string;
  budget: MonthlyBudget | null;
  expenses: Expense[];
  onSelectMonth: (month: string) => void;
  onOpenDayView: (date: string) => void;
  onSetBudgetClick: () => void;
}

export const History: React.FC<HistoryProps> = ({
  currentMonth,
  budget,
  expenses,
  onSelectMonth,
  onOpenDayView,
  onSetBudgetClick,
}) => {
  const today = getTodayDate();
  const actualCurrentMonth = getCurrentMonthKey();
  const isActualCurrentMonth = currentMonth === actualCurrentMonth;
  const daysInMonth = getDaysInMonthKey(currentMonth);

  // Group expenses by date
  const expensesByDate = new Map<string, Expense[]>();
  for (const exp of expenses) {
    const list = expensesByDate.get(exp.date) ?? [];
    list.push(exp);
    expensesByDate.set(exp.date, list);
  }

  const totalSpentMonth = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Build daily rows for every day of the month (1..daysInMonth)
  const rows: Array<{
    date: string;
    dayNumber: number;
    weekday: string;
    spent: number;
    budgetCalc: DayBudget | null;
    isFuture: boolean;
    isToday: boolean;
  }> = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
    const dayExps = expensesByDate.get(dateStr) ?? [];
    const spent = dayExps.reduce((s, e) => s + e.amount, 0);
    const isFuture = dateStr > today;
    const isToday = dateStr === today;

    const budgetCalc = budget ? calculateDayBudget(budget, expenses, dateStr) : null;

    rows.push({
      date: dateStr,
      dayNumber: day,
      weekday: getWeekdayLabel(dateStr, true),
      spent,
      budgetCalc,
      isFuture,
      isToday,
    });
  }

  // Reverse rows so recent dates appear at top (or keep chronological)
  // Usually showing newest dates first is most intuitive for daily tracking
  const displayRows = [...rows].reverse();

  return (
    <div className="history-page">
      {/* Month Navigator */}
      <div className="history-month-bar">
        <button
          type="button"
          className="icon-button"
          onClick={() => onSelectMonth(getPrevMonth(currentMonth))}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="history-month-center">
          <span className="history-month-title font-bold">
            {formatMonthLabel(currentMonth)}
          </span>
          {!isActualCurrentMonth && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onSelectMonth(actualCurrentMonth)}
            >
              Current Month
            </button>
          )}
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={() => onSelectMonth(getNextMonth(currentMonth))}
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Month Summary Bar */}
      {budget && (
        <div className="card history-summary-bar">
          <div className="history-summary-metric">
            <span className="card-label">Monthly Budget</span>
            <span className="font-bold">{formatRs(budget.amount)}</span>
          </div>
          <div className="history-summary-metric">
            <span className="card-label">Total Spent</span>
            <span className="font-bold">{formatRs(totalSpentMonth)}</span>
          </div>
          <div className="history-summary-metric">
            <span className="card-label">Rule</span>
            <span className="badge badge-neutral uppercase">{budget.rule}</span>
          </div>
        </div>
      )}

      {/* If no budget for this month */}
      {!budget && (
        <EmptyState
          title="No Budget Set for this Month"
          description="Configure a monthly budget to calculate daily allowances and history."
          actionLabel="Set Monthly Budget"
          onAction={onSetBudgetClick}
        />
      )}

      {/* Daily Rows Table / List */}
      {budget && (
        <div className="history-list-container">
          <ul className="history-list" aria-label="Month daily history">
            {displayRows.map((row) => {
              const isOverspend = (row.budgetCalc?.overspendToday ?? 0) > 0;
              const hasSpent = row.spent > 0;

              return (
                <li
                  key={row.date}
                  className={`history-row ${row.isToday ? 'history-row-today' : ''} ${
                    row.isFuture ? 'history-row-future' : ''
                  }`}
                  onClick={() => onOpenDayView(row.date)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpenDayView(row.date);
                  }}
                >
                  <div className="history-row-date">
                    <span className="history-day-num">{row.dayNumber}</span>
                    <span className="history-weekday">{row.weekday}</span>
                    {row.isToday && <span className="today-chip">Today</span>}
                    {row.isFuture && (
                      <span className="projection-chip">
                        <Sparkles size={10} /> Proj.
                      </span>
                    )}
                  </div>

                  <div className="history-row-figures">
                    <div className="history-figure-col">
                      <span className="history-col-label">Allowance</span>
                      <span className="history-col-val">
                        {row.budgetCalc ? formatRs(row.budgetCalc.allowanceAtStart) : '-'}
                      </span>
                    </div>

                    <div className="history-figure-col">
                      <span className="history-col-label">Spent</span>
                      <span className={`history-col-val ${hasSpent ? 'font-bold' : 'text-muted'}`}>
                        {formatRs(row.spent)}
                      </span>
                    </div>

                    <div className="history-figure-col history-col-status">
                      <span className="history-col-label">Status</span>
                      {row.budgetCalc ? (
                        isOverspend ? (
                          <span className="status-pill status-danger">
                            <AlertCircle size={12} />
                            <span>Over {formatRs(row.budgetCalc.overspendToday)}</span>
                          </span>
                        ) : (
                          <span className="status-pill status-success">
                            <CheckCircle2 size={12} />
                            <span>{formatRs(row.budgetCalc.remainingAllowance)}</span>
                          </span>
                        )
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </div>

                  <ArrowIcon size={16} className="history-row-chevron" />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
