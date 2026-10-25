import React, { useState, useEffect } from 'react';
import { Expense } from '../domain/types';
import { ALLOWED_CATEGORIES, validateExpenseInput } from '../domain/validation';
import { parseRupees, formatRs } from '../domain/money';
import { formatDisplayDate } from '../domain/dates';
import { X, Plus, Trash2, Check, AlertCircle, Receipt } from 'lucide-react';

interface ExpenseSheetProps {
  isOpen: boolean;
  initialDate: string;
  editingExpense?: Expense | null;
  existingExpenses?: Expense[];
  onClose: () => void;
  onSaveSingle: (data: {
    id?: string;
    amount: number;
    date: string;
    description?: string;
    category?: string;
  }) => Promise<void>;
  onSaveMultiple: (
    items: Array<{ amount: number; date: string; description?: string; category?: string }>
  ) => Promise<void>;
}

interface MultipleItemRow {
  key: string;
  amount: string;
  description: string;
  category: string;
}

export const ExpenseSheet: React.FC<ExpenseSheetProps> = ({
  isOpen,
  initialDate,
  editingExpense,
  existingExpenses = [],
  onClose,
  onSaveSingle,
  onSaveMultiple,
}) => {
  const isEditing = Boolean(editingExpense);
  const [mode, setMode] = useState<'single' | 'multiple'>('single');

  // Single mode state
  const [singleAmount, setSingleAmount] = useState('');
  const [singleDate, setSingleDate] = useState(initialDate);
  const [singleDescription, setSingleDescription] = useState('');
  const [singleCategory, setSingleCategory] = useState<string>('');

  // Multiple mode state
  const [multipleDate, setMultipleDate] = useState(initialDate);
  const [multipleRows, setMultipleRows] = useState<MultipleItemRow[]>([
    { key: 'row-1', amount: '', description: '', category: '' },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when opened or editingExpense changes
  useEffect(() => {
    if (editingExpense) {
      setMode('single');
      setSingleAmount((editingExpense.amount / 100).toString());
      setSingleDate(editingExpense.date);
      setSingleDescription(editingExpense.description ?? '');
      setSingleCategory(editingExpense.category ?? '');
    } else {
      setSingleAmount('');
      setSingleDate(initialDate);
      setSingleDescription('');
      setSingleCategory('');
      setMultipleDate(initialDate);
      setMultipleRows([{ key: 'row-1', amount: '', description: '', category: '' }]);
    }
    setError(null);
    setIsSubmitting(false);
  }, [editingExpense, initialDate, isOpen]);

  if (!isOpen) return null;

  // Running total for multiple entries
  const runningTotalPaisa = multipleRows.reduce((sum, row) => {
    const p = parseRupees(row.amount);
    return sum + (p ?? 0);
  }, 0);

  const handleAddMultipleRow = () => {
    setMultipleRows((prev) => [
      ...prev,
      { key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, amount: '', description: '', category: '' },
    ]);
  };

  const handleRemoveMultipleRow = (index: number) => {
    if (multipleRows.length <= 1) return;
    setMultipleRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMultipleRow = (index: number, field: keyof MultipleItemRow, value: string) => {
    setMultipleRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (mode === 'single') {
      const validation = validateExpenseInput({
        amount: singleAmount,
        date: singleDate,
        description: singleDescription,
        category: singleCategory,
      });

      if (!validation.isValid || !validation.data) {
        setError(validation.error ?? 'Invalid expense data');
        return;
      }

      try {
        setIsSubmitting(true);
        await onSaveSingle({
          id: editingExpense?.id,
          amount: validation.data.amount,
          date: validation.data.date,
          description: validation.data.description,
          category: validation.data.category,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save expense');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Multiple mode
      if (multipleRows.length === 0) {
        setError('Please add at least one expense entry.');
        return;
      }

      const validatedItems: Array<{ amount: number; date: string; description?: string; category?: string }> = [];

      for (let i = 0; i < multipleRows.length; i++) {
        const row = multipleRows[i]!;
        // Skip completely blank rows if there are other rows
        if (!row.amount.trim() && !row.description.trim() && multipleRows.length > 1) {
          continue;
        }

        const v = validateExpenseInput({
          amount: row.amount,
          date: multipleDate,
          description: row.description,
          category: row.category,
        });

        if (!v.isValid || !v.data) {
          setError(`Item #${i + 1}: ${v.error}`);
          return;
        }

        validatedItems.push(v.data);
      }

      if (validatedItems.length === 0) {
        setError('Please enter at least one valid expense amount.');
        return;
      }

      try {
        setIsSubmitting(true);
        await onSaveMultiple(validatedItems);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save expenses');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const activeDate = mode === 'single' ? singleDate : multipleDate;
  const sameDayExpenses = (existingExpenses || []).filter(
    (e) => e.date === activeDate && (!editingExpense || e.id !== editingExpense.id)
  );
  const sameDayTotalPaisa = sameDayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const renderSameDayEntries = () => (
    <div className="sameday-entries-container" aria-label={`Recorded expenses for ${formatDisplayDate(activeDate)}`}>
      <div className="sameday-entries-header">
        <div className="sameday-header-title">
          <Receipt size={15} className="text-accent" />
          <span>Already Applied on {formatDisplayDate(activeDate)}</span>
        </div>
        <span className={`badge ${sameDayExpenses.length > 0 ? 'badge-neutral' : 'badge-subtle'}`}>
          {sameDayExpenses.length} {sameDayExpenses.length === 1 ? 'entry' : 'entries'} • {formatRs(sameDayTotalPaisa)}
        </span>
      </div>

      {sameDayExpenses.length > 0 ? (
        <div className="sameday-entries-list">
          {sameDayExpenses.map((item) => (
            <div key={item.id} className="sameday-entry-row">
              <div className="sameday-entry-details">
                <span className="sameday-entry-name">
                  {item.description?.trim() ? item.description : 'Expense'}
                </span>
                {item.category && (
                  <span className="badge badge-info sameday-badge-sm">{item.category}</span>
                )}
              </div>
              <span className="sameday-entry-price font-bold">
                {formatRs(item.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="sameday-empty-hint">
          No other expenses applied yet on this date.
        </div>
      )}
    </div>
  );

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle-bar" />
        
        <div className="sheet-header">
          <h2 id="sheet-title" className="sheet-title">
            {isEditing ? 'Edit Expense' : 'Record Expense'}
          </h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close bottom sheet"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Switcher (only when adding new) */}
        {!isEditing && (
          <div className="toggle-tab-group" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'single'}
              className={`toggle-tab ${mode === 'single' ? 'active' : ''}`}
              onClick={() => {
                setMode('single');
                setError(null);
              }}
            >
              One Total for Day
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'multiple'}
              className={`toggle-tab ${mode === 'multiple' ? 'active' : ''}`}
              onClick={() => {
                setMode('multiple');
                setError(null);
              }}
            >
              Multiple Expenses
            </button>
          </div>
        )}

        {error && (
          <div className="form-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="sheet-form">
          {mode === 'single' ? (
            <div className="form-fields">
              <div className="form-group">
                <label htmlFor="expense-amount" className="form-label">
                  Amount in Rupees (Rs) <span className="text-danger">*</span>
                </label>
                <div className="input-prefix-wrapper">
                  <span className="input-prefix">Rs</span>
                  <input
                    id="expense-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 450 or 1,250.50"
                    className="form-input text-lg font-bold"
                    value={singleAmount}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="expense-date" className="form-label">
                  Date <span className="text-danger">*</span>
                </label>
                <input
                  id="expense-date"
                  type="date"
                  className="form-input"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  required
                />
              </div>

              {/* Already applied entries for this day */}
              {renderSameDayEntries()}

              <div className="form-group">
                <label htmlFor="expense-category" className="form-label">
                  Category (optional)
                </label>
                <select
                  id="expense-category"
                  className="form-input"
                  value={singleCategory}
                  onChange={(e) => setSingleCategory(e.target.value)}
                >
                  <option value="">No category</option>
                  {ALLOWED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="expense-desc" className="form-label">
                  Description / Note (optional)
                </label>
                <input
                  id="expense-desc"
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Lunch with team, petrol refill"
                  className="form-input"
                  value={singleDescription}
                  onChange={(e) => setSingleDescription(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="multiple-form-fields">
              <div className="form-group">
                <label htmlFor="multiple-date" className="form-label">
                  Expense Date for All Entries
                </label>
                <input
                  id="multiple-date"
                  type="date"
                  className="form-input"
                  value={multipleDate}
                  onChange={(e) => setMultipleDate(e.target.value)}
                  required
                />
              </div>

              {/* Already applied entries for this day */}
              {renderSameDayEntries()}

              <div className="running-total-card">
                <span className="running-total-label">Running Total</span>
                <span className="running-total-value">{formatRs(runningTotalPaisa)}</span>
              </div>

              <div className="multiple-rows-container">
                {multipleRows.map((row, idx) => (
                  <div key={row.key} className="multiple-row-item">
                    <div className="multiple-row-header">
                      <span className="multiple-row-title">Entry #{idx + 1}</span>
                      {multipleRows.length > 1 && (
                        <button
                          type="button"
                          className="icon-action-btn text-danger"
                          onClick={() => handleRemoveMultipleRow(idx)}
                          aria-label={`Remove entry ${idx + 1}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="form-group">
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">Rs</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Amount"
                          className="form-input"
                          value={row.amount}
                          onChange={(e) => handleUpdateMultipleRow(idx, 'amount', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="multi-row-subfields">
                      <select
                        className="form-input"
                        value={row.category}
                        onChange={(e) => handleUpdateMultipleRow(idx, 'category', e.target.value)}
                      >
                        <option value="">Category (optional)</option>
                        {ALLOWED_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Description (optional)"
                        maxLength={200}
                        className="form-input"
                        value={row.description}
                        onChange={(e) => handleUpdateMultipleRow(idx, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-secondary add-row-btn"
                  onClick={handleAddMultipleRow}
                >
                  <Plus size={16} />
                  <span>Add Another Entry</span>
                </button>
              </div>
            </div>
          )}

          <div className="sheet-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              <Check size={18} />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
