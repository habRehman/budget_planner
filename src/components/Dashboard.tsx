import React, { useState } from 'react';
import { DayBudget, Expense, MonthlyBudget, BudgetRule } from '../domain/types';
import { formatRs } from '../domain/money';
import {
  formatDisplayDate,
  formatMonthLabel,
  getTodayDate,
  getPrevMonth,
  getNextMonth,
} from '../domain/dates';
import { MonthProgress } from './MonthProgress';
import { StatCard } from './StatCard';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Receipt,
  Settings as SettingsIcon,
  Sun,
  Moon,
} from 'lucide-react';

interface DashboardProps {
  selectedDate: string;
  selectedMonth: string;
  budget: MonthlyBudget | null;
  dayBudget: DayBudget | null;
  dayExpenses: Expense[];
  daySpentTotal: number;
  yesterdayDate: string;
  yesterdaySpentTotal: number;
  monthSummary: {
    budgetAmount: number;
    totalSpent: number;
    monthRemaining: number;
    monthOverspend: number;
    averageDailySpendSoFar: number;
    daysLeft: number;
    daysElapsed: number;
    daysInMonth: number;
  } | null;
  onSelectDate: (date: string) => void;
  onSelectMonth: (month: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onGoToToday: () => void;
  onOpenDayView: (date: string) => void;
  onOpenAddExpense: () => void;
  onOpenSettings: () => void;
  onSaveBudget: (month: string, amount: number, rule: BudgetRule) => Promise<unknown>;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  selectedDate,
  selectedMonth,
  budget,
  dayBudget,
  dayExpenses,
  daySpentTotal,
  yesterdayDate,
  yesterdaySpentTotal,
  monthSummary,
  onSelectMonth,
  onPrevDay,
  onNextDay,
  onGoToToday,
  onOpenDayView,
  onOpenAddExpense,
  onOpenSettings,
  onSaveBudget,
  theme = 'light',
  onToggleTheme,
}) => {
  const today = getTodayDate();
  const isSelectedDateToday = selectedDate === today;

  // First-run setup form state
  const [setupAmount, setSetupAmount] = useState('');
  const [setupRule, setSetupRule] = useState<BudgetRule>('flex');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    const amountVal = parseFloat(setupAmount.replace(/,/g, ''));
    if (Number.isNaN(amountVal) || amountVal <= 0) {
      setSetupError('Please enter a valid positive budget amount in Rupees.');
      return;
    }
    const paisa = Math.round(amountVal * 100);
    try {
      setIsSettingUp(true);
      await onSaveBudget(selectedMonth, paisa, setupRule);
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Failed to save budget.');
    } finally {
      setIsSettingUp(false);
    }
  };

  // If no budget is set for this month, show guided setup
  if (!budget) {
    return (
      <div className="dashboard-container">
        {/* Header */}
        <header className="app-header">
          <div className="app-branding">
            <div className="app-logo">
              <Wallet size={22} className="text-accent" />
            </div>
            <div>
              <h1 className="app-title">Daily Budget</h1>
              <span className="app-subtitle">PKR Offline Planner</span>
            </div>
          </div>
          <div className="app-header-actions">
            {onToggleTheme && (
              <button
                type="button"
                className="icon-button"
                onClick={onToggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              onClick={onOpenSettings}
              aria-label="Settings"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </header>

        {/* Month Selector */}
        <div className="month-nav-bar">
          <button
            type="button"
            className="icon-button"
            onClick={() => onSelectMonth(getPrevMonth(selectedMonth))}
            aria-label="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="month-nav-label font-bold">
            {formatMonthLabel(selectedMonth)}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => onSelectMonth(getNextMonth(selectedMonth))}
            aria-label="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Guided Setup Card */}
        <div className="card setup-card">
          <div className="setup-header">
            <div className="setup-badge">First-Time Setup</div>
            <h2 className="setup-title">Set Monthly Budget for {formatMonthLabel(selectedMonth)}</h2>
            <p className="setup-desc">
              Define your monthly spending limit to calculate dynamic daily allowances.
            </p>
          </div>

          {setupError && (
            <div className="form-error-banner">
              <AlertCircle size={16} />
              <span>{setupError}</span>
            </div>
          )}

          <form onSubmit={handleSetupSubmit} className="setup-form">
            <div className="form-group">
              <label htmlFor="budget-input" className="form-label">
                Monthly Budget (PKR)
              </label>
              <div className="input-prefix-wrapper">
                <span className="input-prefix">Rs</span>
                <input
                  id="budget-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 50,000"
                  className="form-input text-lg font-bold"
                  value={setupAmount}
                  onChange={(e) => setSetupAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <span className="form-label">Budget Calculation Rule</span>
              <div className="radio-tile-group">
                <label className={`radio-tile ${setupRule === 'flex' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="setup-rule"
                    value="flex"
                    checked={setupRule === 'flex'}
                    onChange={() => setSetupRule('flex')}
                  />
                  <div className="radio-tile-content">
                    <span className="radio-tile-title">Flexible (Recommended)</span>
                    <span className="radio-tile-desc">
                      Under-spending increases future daily allowances; overspending dynamically lowers them.
                    </span>
                  </div>
                </label>

                <label className={`radio-tile ${setupRule === 'fixed' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="setup-rule"
                    value="fixed"
                    checked={setupRule === 'fixed'}
                    onChange={() => setSetupRule('fixed')}
                  />
                  <div className="radio-tile-content">
                    <span className="radio-tile-title">Fixed</span>
                    <span className="radio-tile-desc">
                      Equal daily allowance every day. Unspent money does not carry over.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={isSettingUp}
            >
              {isSettingUp ? 'Saving Budget...' : 'Start Budgeting'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active budget view
  const isOverspendToday = (dayBudget?.overspendToday ?? 0) > 0;
  const isProjection = dayBudget?.isProjection ?? false;

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="app-branding">
          <div className="app-logo">
            <Wallet size={22} className="text-accent" />
          </div>
          <div>
            <h1 className="app-title">Daily Budget</h1>
            <span className="app-subtitle">{formatMonthLabel(selectedMonth)}</span>
          </div>
        </div>
        <div className="app-header-actions">
          {onToggleTheme && (
            <button
              type="button"
              className="icon-button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            onClick={onOpenSettings}
            aria-label="Settings"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      {/* Date Navigation Bar ("‹ date ›" plus a "Today" button) */}
      <nav className="date-nav-bar" aria-label="Date Selection">
        <div className="date-nav-controls">
          <button
            type="button"
            className="icon-button"
            onClick={onPrevDay}
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="date-nav-display">
            <Calendar size={15} className="inline-icon text-accent" />
            <span className="date-nav-text font-bold">
              {formatDisplayDate(selectedDate)}
            </span>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onNextDay}
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {!isSelectedDateToday && (
          <button
            type="button"
            className="btn btn-secondary btn-sm today-btn"
            onClick={onGoToToday}
          >
            Today
          </button>
        )}
      </nav>

      {/* Available to Spend Card (Hero Card) */}
      {dayBudget && (
        <section
          className={`card available-hero-card ${
            isOverspendToday ? 'hero-card-danger' : 'hero-card-accent'
          }`}
          aria-label="Daily allowance summary"
        >
          <div className="hero-header">
            <span className="card-label">
              {isProjection ? 'Projected Allowance' : 'Available to Spend Today'}
            </span>
            {isProjection && (
              <span className="badge badge-info">
                <Sparkles size={12} className="badge-icon" />
                <span>Projection</span>
              </span>
            )}
          </div>

          <div className="hero-main-figure">
            {formatRs(dayBudget.availableNow)}
          </div>

          {/* Status Breakdown */}
          <div className="hero-status-row">
            {isOverspendToday ? (
              <div className="status-pill status-danger">
                <AlertCircle size={15} />
                <span>Over by {formatRs(dayBudget.overspendToday)}</span>
              </div>
            ) : (
              <div className="status-pill status-success">
                <CheckCircle2 size={15} />
                <span>Remaining: {formatRs(dayBudget.remainingAllowance)}</span>
              </div>
            )}
          </div>

          {/* Allowance & Spent Breakdown */}
          <div className="hero-breakdown-grid">
            <div className="hero-metric">
              <span className="hero-metric-label">Allowance at Start</span>
              <span className="hero-metric-value">{formatRs(dayBudget.allowanceAtStart)}</span>
            </div>
            <div className="hero-metric">
              <span className="hero-metric-label">Spent Today</span>
              <span className="hero-metric-value">{formatRs(dayBudget.spentThatDay)}</span>
            </div>
            <div className="hero-metric">
              <span className="hero-metric-label">Days Left (incl.)</span>
              <span className="hero-metric-value">{dayBudget.daysRemainingInclusive}</span>
            </div>
          </div>
        </section>
      )}

      {/* Today's & Yesterday's Expense Cards Grid */}
      <section className="cards-grid-2" aria-label="Recent expenses">
        <StatCard
          title="Today's Expenses"
          value={formatRs(daySpentTotal)}
          subtitle={`${dayExpenses.length} ${dayExpenses.length === 1 ? 'entry' : 'entries'}`}
          icon={Receipt}
          badge={{
            text: isSelectedDateToday ? 'Today' : 'Selected Day',
            variant: 'neutral',
          }}
          onClick={() => onOpenDayView(selectedDate)}
        />

        <StatCard
          title="Yesterday's Expenses"
          value={formatRs(yesterdaySpentTotal)}
          subtitle="Tap to view entries"
          icon={Calendar}
          badge={{ text: 'Yesterday', variant: 'neutral' }}
          onClick={() => onOpenDayView(yesterdayDate)}
        />
      </section>

      {/* Monthly Remaining Card with Progress Bar */}
      {monthSummary && (
        <section aria-label="Monthly overview">
          <MonthProgress
            budgetAmount={monthSummary.budgetAmount}
            totalSpent={monthSummary.totalSpent}
            monthRemaining={monthSummary.monthRemaining}
            monthOverspend={monthSummary.monthOverspend}
            averageDailySpendSoFar={monthSummary.averageDailySpendSoFar}
            daysLeft={monthSummary.daysLeft}
            daysElapsed={monthSummary.daysElapsed}
            daysInMonth={monthSummary.daysInMonth}
            monthLabel={formatMonthLabel(selectedMonth)}
          />
        </section>
      )}

      {/* Floating / Prominent Add Expense Action */}
      <div className="dashboard-add-cta">
        <button
          type="button"
          className="btn btn-primary btn-lg btn-block shadow-lg"
          onClick={onOpenAddExpense}
        >
          <Plus size={20} />
          <span>Record Expense</span>
        </button>
      </div>
    </div>
  );
};
