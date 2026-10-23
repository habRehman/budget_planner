import React from 'react';
import { Expense } from '../domain/types';
import { formatRs } from '../domain/money';
import { Tag, Edit2, Trash2 } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  emptyMessage?: string;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onEdit,
  onDelete,
  emptyMessage = 'No expenses recorded for this day.',
}) => {
  if (expenses.length === 0) {
    return <div className="expense-list-empty">{emptyMessage}</div>;
  }

  return (
    <ul className="expense-list" aria-label="Expenses list">
      {expenses.map((expense) => (
        <li key={expense.id} className="expense-item">
          <div className="expense-item-main">
            <div className="expense-item-info">
              <span className="expense-item-amount">{formatRs(expense.amount)}</span>
              {expense.category && (
                <span className="expense-category-pill">
                  <Tag size={12} className="inline-icon" />
                  {expense.category}
                </span>
              )}
            </div>
            {expense.description && (
              <p className="expense-item-desc">{expense.description}</p>
            )}
          </div>

          <div className="expense-item-actions">
            {onEdit && (
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => onEdit(expense)}
                aria-label={`Edit expense ${formatRs(expense.amount)}`}
              >
                <Edit2 size={16} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="icon-action-btn text-danger"
                onClick={() => onDelete(expense)}
                aria-label={`Delete expense ${formatRs(expense.amount)}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};
