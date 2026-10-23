import { describe, it, expect } from 'vitest';
import { parseRupees, formatRs, splitEvenly } from '../src/domain/money';

describe('money domain utility', () => {
  describe('Test 11: parseRupees', () => {
    it('rejects invalid inputs: -5, 0, 1e3, abc, 1.234, empty, 10+ digits', () => {
      expect(parseRupees('-5')).toBeNull();
      expect(parseRupees('0')).toBeNull();
      expect(parseRupees('0.00')).toBeNull();
      expect(parseRupees('1e3')).toBeNull();
      expect(parseRupees('abc')).toBeNull();
      expect(parseRupees('1.234')).toBeNull();
      expect(parseRupees('')).toBeNull();
      expect(parseRupees('   ')).toBeNull();
      // 10+ integer digits
      expect(parseRupees('1000000000')).toBeNull();
      expect(parseRupees('1,000,000,000')).toBeNull();
    });

    it('accepts valid inputs: 450, 1,250.5', () => {
      // 450 Rs = 45000 paisa
      expect(parseRupees('450')).toBe(45000);
      // 1,250.5 Rs = 125050 paisa
      expect(parseRupees('1,250.5')).toBe(125050);
      // 1,250.50 Rs = 125050 paisa
      expect(parseRupees('1,250.50')).toBe(125050);
      // single rupee
      expect(parseRupees('1')).toBe(100);
      expect(parseRupees('0.50')).toBe(50);
      expect(parseRupees('0.05')).toBe(5);
    });
  });

  describe('Test 12: splitEvenly', () => {
    it('always sums to the total exactly', () => {
      const cases = [
        { total: 100, parts: 3 },
        { total: 2000000, parts: 31 },
        { total: 1000, parts: 7 },
        { total: 1, parts: 5 },
        { total: 0, parts: 10 },
        { total: 31, parts: 31 },
        { total: 30, parts: 31 },
      ];

      for (const { total, parts } of cases) {
        const shares = splitEvenly(total, parts);
        expect(shares).toHaveLength(parts);
        const sum = shares.reduce((a, b) => a + b, 0);
        expect(sum).toBe(total);

        // Verify the first (total % parts) get 1 extra paisa
        const remainder = total % parts;
        const base = Math.floor(total / parts);
        for (let i = 0; i < parts; i++) {
          if (i < remainder) {
            expect(shares[i]).toBe(base + 1);
          } else {
            expect(shares[i]).toBe(base);
          }
        }
      }
    });
  });

  describe('formatRs', () => {
    it('formats Pakistani rupees using en-PK locale with two decimal places', () => {
      expect(formatRs(64516)).toBe('Rs 645.16');
      expect(formatRs(2000000)).toBe('Rs 20,000.00');
      expect(formatRs(0)).toBe('Rs 0.00');
      expect(formatRs(-64516)).toBe('-Rs 645.16');
      expect(formatRs(-40000)).toBe('-Rs 400.00');
    });
  });
});
