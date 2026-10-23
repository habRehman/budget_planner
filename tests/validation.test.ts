import { describe, it, expect } from 'vitest';
import {
  validateExpenseInput,
  validateBudgetInput,
} from '../src/domain/validation';

describe('validation domain utility', () => {
  describe('validateExpenseInput', () => {
    it('accepts valid string amounts and formats date', () => {
      const res = validateExpenseInput({
        amount: '1,250.50',
        date: '2026-10-23',
        description: 'Grocery shopping',
        category: 'Food & Groceries',
      });
      expect(res.isValid).toBe(true);
      expect(res.data?.amount).toBe(125050);
      expect(res.data?.description).toBe('Grocery shopping');
      expect(res.data?.category).toBe('Food & Groceries');
    });

    it('rejects invalid or negative amounts', () => {
      expect(validateExpenseInput({ amount: '-500', date: '2026-10-23' }).isValid).toBe(false);
      expect(validateExpenseInput({ amount: '0', date: '2026-10-23' }).isValid).toBe(false);
      expect(validateExpenseInput({ amount: 'abc', date: '2026-10-23' }).isValid).toBe(false);
    });

    it('rejects invalid calendar dates', () => {
      // 2026 is not leap year
      expect(validateExpenseInput({ amount: '100', date: '2026-02-29' }).isValid).toBe(false);
      expect(validateExpenseInput({ amount: '100', date: '2026-13-01' }).isValid).toBe(false);
      expect(validateExpenseInput({ amount: '100', date: 'not-a-date' }).isValid).toBe(false);
    });

    it('rejects descriptions exceeding 200 characters', () => {
      const longDesc = 'a'.repeat(201);
      expect(validateExpenseInput({ amount: '100', date: '2026-10-23', description: longDesc }).isValid).toBe(false);
    });
  });

  describe('validateBudgetInput', () => {
    it('accepts valid budget inputs for flex and fixed rules', () => {
      const flex = validateBudgetInput({ month: '2026-10', amount: '50000', rule: 'flex' });
      expect(flex.isValid).toBe(true);
      expect(flex.data?.amount).toBe(5000000);
      expect(flex.data?.rule).toBe('flex');

      const fixed = validateBudgetInput({ month: '2026-11', amount: '25,000.50', rule: 'fixed' });
      expect(fixed.isValid).toBe(true);
      expect(fixed.data?.amount).toBe(2500050);
      expect(fixed.data?.rule).toBe('fixed');
    });

    it('rejects invalid month or negative amounts', () => {
      expect(validateBudgetInput({ month: 'invalid', amount: '5000', rule: 'flex' }).isValid).toBe(false);
      expect(validateBudgetInput({ month: '2026-15', amount: '5000', rule: 'flex' }).isValid).toBe(false);
      expect(validateBudgetInput({ month: '2026-10', amount: '-100', rule: 'flex' }).isValid).toBe(false);
      expect(validateBudgetInput({ month: '2026-10', amount: '5000', rule: 'unknown' }).isValid).toBe(false);
    });
  });
});
