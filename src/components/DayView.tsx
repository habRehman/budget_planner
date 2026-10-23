import React, { useState } from 'react';
import { Expense, DayBudget } from '../domain/types';
import { formatRs } from '../domain/money';
import { formatDisplayDate, getWeekdayLabel } from '../domain/dates';
import { ExpenseList } from './ExpenseList';
import { ConfirmDialog } from './ConfirmDialog';
import { ArrowLeft, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DayViewProps {
  date: string;
  dayBudget: DayBudget | null;
  expenses: Expense[];
  onBack: () => void;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => Promise<void>;
}

export const DayView: React.FC<DayViewProps> = ({
  date,
  dayBudget,
  expenses,
  onBack,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const weekday = getWeekdayLabel(date, false);
  const displayDate = formatDisplayDate(date);

  const isOverspend = (dayBudget?.overspendToday ?? 0) > 0;

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="day-view-page">
      {/* Header */}
      <div className="day-view-header">
        <button
          type="button"
          className="icon-button"
          onClick={onBack}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="day-view-header-title">
          <span className="day-view-weekday">{weekday}</span>
          <h2 className="day-view-date">{displayDate}</h2>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onAddExpense}
        >
          <Plus size={16} />
          <span>Add</span>
        </button>
      </div>

      {/* Financial Summary Card for the Day */}
      {dayBudget && (
        <div className="card day-summary-card">
          <div className="day-summary-row">
            <div>
              <span className="card-label">Daily Allowance</span>
              <div className="day-summary-figure font-bold">
                {formatRs(dayBudget.allowanceAtStart)}
              </div>
            </div>

            <div>
              <span className="card-label">Spent Today</span>
              <div className="day-summary-figure text-main">
                {formatRs(totalSpent)}
              </div>
            </div>

            <div>
              <span className="card-label">Status</span>
              {isOverspend ? (
                <div className="status-pill status-danger">
                  <AlertCircle size={14} />
                  <span>Over by {formatRs(dayBudget.overspendToday)}</span>
                </div>
              ) : (
                <div className="status-pill status-success">
                  <CheckCircle2 size={14} />
                  <span>Remaining: {formatRs(dayBudget.remainingAllowance)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expenses Breakdown */}
      <div className="day-view-section">
        <div className="section-header">
          <h3 className="section-title">Recorded Entries ({expenses.length})</h3>
          <span className="section-total">Total: {formatRs(totalSpent)}</span>
        </div>

        <ExpenseList
          expenses={expenses}
          onEdit={onEditExpense}
          onDelete={(exp) => setExpenseToDelete(exp)}
          emptyMessage="No expenses recorded for this date."
        />
      </div>

      {/* Confirmation Dialog for Deleting */}
      <ConfirmDialog
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense of ${
          expenseToDelete ? formatRs(expenseToDelete.amount) : ''
        }? This action will update your budget calculations immediately.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        isDanger={true}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
};
