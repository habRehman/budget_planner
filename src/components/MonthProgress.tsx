import React from 'react';
import { AlertCircle, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';
import { formatRs } from '../domain/money';

interface MonthProgressProps {
  budgetAmount: number;
  totalSpent: number;
  monthRemaining: number;
  monthOverspend: number;
  averageDailySpendSoFar: number;
  daysLeft: number;
  daysElapsed: number;
  daysInMonth: number;
  monthLabel: string;
}

export const MonthProgress: React.FC<MonthProgressProps> = ({
  budgetAmount,
  totalSpent,
  monthRemaining,
  monthOverspend,
  averageDailySpendSoFar,
  daysLeft,
  daysElapsed,
  daysInMonth,
  monthLabel,
}) => {
  const isOverBudget = monthOverspend > 0;
  const percentage = budgetAmount > 0 ? Math.min(100, Math.round((totalSpent / budgetAmount) * 100)) : 0;

  return (
    <div className="card month-progress-card">
      <div className="month-progress-header">
        <div>
          <span className="card-label">Monthly Budget Overview</span>
          <h3 className="month-progress-title">{monthLabel}</h3>
        </div>
        {isOverBudget ? (
          <div className="status-pill status-danger">
            <AlertCircle size={14} />
            <span>Over budget by {formatRs(monthOverspend)}</span>
          </div>
        ) : (
          <div className="status-pill status-success">
            <CheckCircle2 size={14} />
            <span>Remaining: {formatRs(monthRemaining)}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div
          className={`progress-bar-fill ${isOverBudget ? 'progress-fill-danger' : 'progress-fill-accent'}`}
          style={{ width: `${Math.min(100, isOverBudget ? 100 : percentage)}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Monthly budget spent percentage"
        />
      </div>

      <div className="progress-meta-row">
        <span>{percentage}% spent</span>
        <span>Budget: {formatRs(budgetAmount)}</span>
      </div>

      {/* Financial Details Grid */}
      <div className="progress-stats-grid">
        <div className="stat-item">
          <span className="stat-item-label">Total Spent</span>
          <span className="stat-item-val">{formatRs(totalSpent)}</span>
        </div>

        <div className="stat-item">
          <span className="stat-item-label">Average Daily Spend</span>
          <span className="stat-item-val">
            <TrendingUp size={13} className="inline-icon" />
            {formatRs(averageDailySpendSoFar)} / day
          </span>
        </div>

        <div className="stat-item">
          <span className="stat-item-label">Month Timeline</span>
          <span className="stat-item-val">
            <Calendar size={13} className="inline-icon" />
            Day {daysElapsed} of {daysInMonth} ({daysLeft} days left)
          </span>
        </div>
      </div>
    </div>
  );
};
