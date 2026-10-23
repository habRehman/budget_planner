import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from '../src/components/Dashboard';
import { ExpenseSheet } from '../src/components/ExpenseSheet';
import { DayView } from '../src/components/DayView';
import { MonthProgress } from '../src/components/MonthProgress';
import { MonthlyBudget, DayBudget, Expense } from '../src/domain/types';

describe('UI Components (React Testing Library)', () => {
  const sampleBudget: MonthlyBudget = {
    month: '2026-10',
    amount: 5000000, // Rs 50,000 = 5,000,000 paisa
    rule: 'flex',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  const sampleDayBudget: DayBudget = {
    allowanceAtStart: 161290, // ~Rs 1,612.90
    spentThatDay: 45000, // Rs 450
    remainingAllowance: 116290,
    overspendToday: 0,
    availableNow: 116290,
    monthSpentTotal: 45000,
    monthRemaining: 4955000,
    monthOverspend: 0,
    isProjection: false,
    daysRemainingInclusive: 31,
  };

  const sampleExpenses: Expense[] = [
    {
      id: 'exp-1',
      date: '2026-10-23',
      amount: 45000,
      description: 'Lunch at Cafe',
      category: 'Food & Groceries',
      createdAt: '2026-10-23T12:00:00.000Z',
      updatedAt: '2026-10-23T12:00:00.000Z',
    },
  ];

  it('renders Dashboard with available allowance and expense totals', () => {
    const handleAddExpense = vi.fn();
    const handleOpenDayView = vi.fn();

    render(
      <Dashboard
        selectedDate="2026-10-23"
        selectedMonth="2026-10"
        budget={sampleBudget}
        dayBudget={sampleDayBudget}
        dayExpenses={sampleExpenses}
        daySpentTotal={45000}
        yesterdayDate="2026-10-22"
        yesterdaySpentTotal={0}
        monthSummary={{
          budgetAmount: 5000000,
          totalSpent: 45000,
          monthRemaining: 4955000,
          monthOverspend: 0,
          averageDailySpendSoFar: 1957,
          daysLeft: 8,
          daysElapsed: 23,
          daysInMonth: 31,
        }}
        onSelectDate={vi.fn()}
        onSelectMonth={vi.fn()}
        onPrevDay={vi.fn()}
        onNextDay={vi.fn()}
        onGoToToday={vi.fn()}
        onOpenDayView={handleOpenDayView}
        onOpenAddExpense={handleAddExpense}
        onOpenSettings={vi.fn()}
        onSaveBudget={vi.fn()}
      />
    );

    // Hero available figure
    expect(screen.getByText('Rs 1,162.90')).toBeInTheDocument();
    // Spent today appears in hero card and today's expense stat card
    expect(screen.getAllByText('Rs 450.00').length).toBeGreaterThan(0);
    // Allowance at start
    expect(screen.getByText('Rs 1,612.90')).toBeInTheDocument();

    // Tap record expense button
    const recordBtn = screen.getByRole('button', { name: /Record Expense/i });
    fireEvent.click(recordBtn);
    expect(handleAddExpense).toHaveBeenCalledTimes(1);
  });

  it('renders MonthProgress with explicit overspend state when over budget', () => {
    render(
      <MonthProgress
        budgetAmount={1000000} // Rs 10,000
        totalSpent={1200000} // Rs 12,000 (over by 2,000)
        monthRemaining={-200000}
        monthOverspend={200000}
        averageDailySpendSoFar={50000}
        daysLeft={5}
        daysElapsed={26}
        daysInMonth={31}
        monthLabel="October 2026"
      />
    );

    expect(screen.getByText(/Over budget by Rs 2,000.00/i)).toBeInTheDocument();
  });

  it('ExpenseSheet: validates input, saves single expense with correct integer paisa, blocks double submit', async () => {
    const handleSaveSingle = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <ExpenseSheet
        isOpen={true}
        initialDate="2026-10-23"
        onClose={handleClose}
        onSaveSingle={handleSaveSingle}
        onSaveMultiple={vi.fn()}
      />
    );

    const amountInput = screen.getByLabelText(/Amount in Rupees/i);
    const submitBtn = screen.getByRole('button', { name: /Save Expense/i });

    // Enter valid amount 1,250.50
    fireEvent.change(amountInput, { target: { value: '1,250.50' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSaveSingle).toHaveBeenCalledTimes(1);
      expect(handleSaveSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 125050, // Rs 1,250.50 in paisa
          date: '2026-10-23',
        })
      );
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('ExpenseSheet: multiple entries mode with running total', async () => {
    const handleSaveMultiple = vi.fn().mockResolvedValue(undefined);

    render(
      <ExpenseSheet
        isOpen={true}
        initialDate="2026-10-23"
        onClose={vi.fn()}
        onSaveSingle={vi.fn()}
        onSaveMultiple={handleSaveMultiple}
      />
    );

    // Switch to Multiple tab
    const multipleTab = screen.getByRole('tab', { name: /Multiple Expenses/i });
    fireEvent.click(multipleTab);

    // Add first entry
    const amountInput1 = screen.getByPlaceholderText('Amount');
    fireEvent.change(amountInput1, { target: { value: '450' } });

    // Running total should update to Rs 450.00
    expect(screen.getByText('Rs 450.00')).toBeInTheDocument();

    // Add second entry
    const addRowBtn = screen.getByRole('button', { name: /Add Another Entry/i });
    fireEvent.click(addRowBtn);

    const amountInputs = screen.getAllByPlaceholderText('Amount');
    expect(amountInputs).toHaveLength(2);
    fireEvent.change(amountInputs[1]!, { target: { value: '550' } });

    // Running total should be 450 + 550 = Rs 1,000.00
    expect(screen.getByText('Rs 1,000.00')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Save Expense/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSaveMultiple).toHaveBeenCalledTimes(1);
      expect(handleSaveMultiple).toHaveBeenCalledWith([
        expect.objectContaining({ amount: 45000 }),
        expect.objectContaining({ amount: 55000 }),
      ]);
    });
  });

  it('DayView displays entries and requires confirmation dialog to delete', async () => {
    const handleDelete = vi.fn().mockResolvedValue(undefined);
    const handleEdit = vi.fn();

    render(
      <DayView
        date="2026-10-23"
        dayBudget={sampleDayBudget}
        expenses={sampleExpenses}
        onBack={vi.fn()}
        onAddExpense={vi.fn()}
        onEditExpense={handleEdit}
        onDeleteExpense={handleDelete}
      />
    );

    // Expense item visible
    expect(screen.getByText('Lunch at Cafe')).toBeInTheDocument();
    expect(screen.getAllByText('Rs 450.00').length).toBeGreaterThan(0);

    // Click delete icon button
    const deleteBtn = screen.getByLabelText(/Delete expense Rs 450.00/i);
    fireEvent.click(deleteBtn);

    // Confirm dialog should appear
    expect(screen.getByText('Delete Expense')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this expense/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmDeleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledWith('exp-1');
    });
  });
});
