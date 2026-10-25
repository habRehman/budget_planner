import { describe, it, expect } from 'vitest';
import { evaluateMathExpression } from '../src/components/CalculatorModal';

describe('evaluateMathExpression', () => {
  it('evaluates single numbers and numbers with commas', () => {
    expect(evaluateMathExpression('50000')).toBe(50000);
    expect(evaluateMathExpression('50,000')).toBe(50000);
    expect(evaluateMathExpression('1250.75')).toBe(1250.75);
  });

  it('evaluates addition and subtraction', () => {
    expect(evaluateMathExpression('25000 + 15000')).toBe(40000);
    expect(evaluateMathExpression('50000 - 12000')).toBe(38000);
    expect(evaluateMathExpression('10000 + 5000 - 2000 + 1500')).toBe(14500);
  });

  it('evaluates multiplication and division with correct operator precedence', () => {
    expect(evaluateMathExpression('1000 * 30')).toBe(30000);
    expect(evaluateMathExpression('1000 × 30')).toBe(30000);
    expect(evaluateMathExpression('60000 / 2')).toBe(30000);
    expect(evaluateMathExpression('60000 ÷ 2')).toBe(30000);
    // 5000 + 2000 * 3 should be 5000 + 6000 = 11000, not (5000 + 2000) * 3 = 21000
    expect(evaluateMathExpression('5000 + 2000 * 3')).toBe(11000);
  });

  it('gracefully evaluates interim expressions ending with an operator', () => {
    expect(evaluateMathExpression('30000 +')).toBe(30000);
    expect(evaluateMathExpression('30000 -')).toBe(30000);
    expect(evaluateMathExpression('30000 *')).toBe(30000);
  });

  it('safely returns null for invalid inputs or division by zero', () => {
    expect(evaluateMathExpression('')).toBeNull();
    expect(evaluateMathExpression('   ')).toBeNull();
    expect(evaluateMathExpression('50000 / 0')).toBeNull();
    expect(evaluateMathExpression('abc')).toBeNull();
  });
});
