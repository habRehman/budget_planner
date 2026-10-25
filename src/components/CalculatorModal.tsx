import React, { useState, useEffect, useCallback } from 'react';
import { X, Delete, Check, Calculator } from 'lucide-react';
import { formatRs } from '../domain/money';

interface CalculatorModalProps {
  isOpen: boolean;
  title?: string;
  initialValue?: number | string;
  monthLabel?: string;
  onClose: () => void;
  onApply: (amountInRupees: number) => void;
}

/**
 * Safely evaluates a simple arithmetic expression (+, -, *, /).
 * Does not use eval(). Returns null if expression is invalid or incomplete.
 */
export function evaluateMathExpression(rawExpr: string): number | null {
  if (!rawExpr || !rawExpr.trim()) return null;

  // Clean string: replace visual operators and commas
  const cleaned = rawExpr
    .replace(/,/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .trim();

  // Validate allowed characters: digits, decimal point, +, -, *, /, spaces, parentheses
  if (!/^[0-9+\-*/. ()]+$/.test(cleaned)) {
    return null;
  }

  // Tokenize into numbers and operators
  const tokens: Array<string | number> = [];
  let currentNum = '';

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]!;
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      currentNum += ch;
    } else if (['+', '-', '*', '/'].includes(ch)) {
      if (currentNum !== '') {
        const parsed = parseFloat(currentNum);
        if (Number.isNaN(parsed)) return null;
        tokens.push(parsed);
        currentNum = '';
      } else if (ch === '-' && (tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string')) {
        // Unary minus
        currentNum = '-';
        continue;
      }
      tokens.push(ch);
    } else if (ch === ' ') {
      if (currentNum !== '') {
        const parsed = parseFloat(currentNum);
        if (Number.isNaN(parsed)) return null;
        tokens.push(parsed);
        currentNum = '';
      }
    }
  }

  if (currentNum !== '') {
    const parsed = parseFloat(currentNum);
    if (Number.isNaN(parsed)) return null;
    tokens.push(parsed);
  }

  if (tokens.length === 0) return null;

  // If the last token is an operator, remove it for interim evaluation (e.g. "500 + " -> 500)
  const evalTokens = [...tokens];
  while (evalTokens.length > 0 && typeof evalTokens[evalTokens.length - 1] === 'string') {
    evalTokens.pop();
  }

  if (evalTokens.length === 0) return null;

  // First pass: handle * and /
  const pass1: Array<string | number> = [];
  let idx = 0;
  while (idx < evalTokens.length) {
    const token = evalTokens[idx]!;
    if (token === '*' || token === '/') {
      const prev = pass1.pop();
      const next = evalTokens[idx + 1];
      if (typeof prev !== 'number' || typeof next !== 'number') return null;
      if (token === '/' && next === 0) return null; // Division by zero
      const res = token === '*' ? prev * next : prev / next;
      pass1.push(res);
      idx += 2;
    } else {
      pass1.push(token);
      idx++;
    }
  }

  // Second pass: handle + and -
  if (pass1.length === 0 || typeof pass1[0] !== 'number') return null;
  let result = pass1[0];
  let pIdx = 1;

  while (pIdx < pass1.length) {
    const op = pass1[pIdx];
    const next = pass1[pIdx + 1];
    if (typeof op !== 'string' || typeof next !== 'number') return null;

    if (op === '+') {
      result += next;
    } else if (op === '-') {
      result -= next;
    }
    pIdx += 2;
  }

  if (Number.isNaN(result) || !Number.isFinite(result)) return null;
  return Math.round(result * 100) / 100;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  title = 'Budget Calculator Dial Pad',
  initialValue = '',
  monthLabel,
  onClose,
  onApply,
}) => {
  const [expression, setExpression] = useState('');
  const [evaluatedResult, setEvaluatedResult] = useState<number | null>(null);

  // Sync initial value when opened
  useEffect(() => {
    if (isOpen) {
      const initStr =
        typeof initialValue === 'number'
          ? initialValue > 0
            ? String(initialValue)
            : ''
          : String(initialValue).replace(/,/g, '').trim();
      setExpression(initStr);
      const evalRes = evaluateMathExpression(initStr);
      setEvaluatedResult(evalRes);
    }
  }, [isOpen, initialValue]);

  const handleKeyPress = useCallback((key: string) => {
    setExpression((prev) => {
      let next = prev;
      if (key === 'AC') {
        next = '';
      } else if (key === 'BACKSPACE') {
        next = prev.slice(0, -1);
      } else if (key === '=') {
        const evalVal = evaluateMathExpression(prev);
        if (evalVal !== null && evalVal >= 0) {
          next = String(evalVal);
        }
      } else if (['+', '-', '×', '÷'].includes(key)) {
        // If string ends with operator, replace operator
        if (/[\+\-×÷]$/.test(prev.trim())) {
          next = prev.trim().slice(0, -1) + ' ' + key + ' ';
        } else if (prev.trim().length > 0) {
          next = prev.trim() + ' ' + key + ' ';
        }
      } else if (key === '.') {
        const lastPart = prev.split(/[\+\-×÷]/).pop() || '';
        if (!lastPart.includes('.')) {
          next = prev + '.';
        }
      } else if (key === '00') {
        if (prev.length > 0 && !/[\+\-×÷]\s*$/.test(prev)) {
          next = prev + '00';
        }
      } else {
        // Digit 0-9
        next = prev + key;
      }

      const evalRes = evaluateMathExpression(next);
      setEvaluatedResult(evalRes);
      return next;
    });
  }, []);

  const handlePresetAdd = (amount: number) => {
    setExpression((prev) => {
      const cleanPrev = prev.trim();
      let next = '';
      if (!cleanPrev || cleanPrev === '0') {
        next = String(amount);
      } else if (/[\+\-×÷]$/.test(cleanPrev)) {
        next = cleanPrev + ' ' + amount;
      } else {
        next = cleanPrev + ' + ' + amount;
      }
      const evalRes = evaluateMathExpression(next);
      setEvaluatedResult(evalRes);
      return next;
    });
  };

  // Keyboard support for desktop / hardware input
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (evaluatedResult !== null && evaluatedResult > 0) {
          onApply(evaluatedResult);
          onClose();
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('BACKSPACE');
      } else if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === '+') {
        e.preventDefault();
        handleKeyPress('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleKeyPress('-');
      } else if (e.key === '*' || e.key === 'x') {
        e.preventDefault();
        handleKeyPress('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleKeyPress('÷');
      } else if (e.key === '=') {
        e.preventDefault();
        handleKeyPress('=');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, evaluatedResult, handleKeyPress, onApply, onClose]);

  if (!isOpen) return null;

  const handleApplyClick = () => {
    if (evaluatedResult !== null && evaluatedResult > 0) {
      onApply(evaluatedResult);
      onClose();
    }
  };

  const isExpressionValid = evaluatedResult !== null && evaluatedResult > 0;
  const paisaEquivalent = evaluatedResult !== null ? Math.round(evaluatedResult * 100) : null;

  return (
    <div className="bottom-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="calculator-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle-bar" />

        {/* Header */}
        <div className="calculator-header">
          <div className="calculator-title-group">
            <div className="calc-logo-badge">
              <Calculator size={18} className="text-accent" />
            </div>
            <div>
              <h2 id="calc-title" className="calculator-title">
                {title}
              </h2>
              {monthLabel && <span className="calculator-subtitle">{monthLabel}</span>}
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close calculator"
          >
            <X size={20} />
          </button>
        </div>

        {/* Screen Display */}
        <div className="calculator-screen" aria-live="polite">
          <div className="calculator-formula">
            {expression || '0'}
          </div>
          <div className="calculator-preview">
            <span className="calc-currency">Rs</span>
            <span className="calc-big-value">
              {paisaEquivalent !== null ? (paisaEquivalent / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0'}
            </span>
          </div>
          {paisaEquivalent !== null && paisaEquivalent > 0 && (
            <div className="calculator-formatted-sub">
              {formatRs(paisaEquivalent)} monthly allocation
            </div>
          )}
        </div>

        {/* Quick Add Presets */}
        <div className="calc-presets-row" aria-label="Quick increments">
          <span className="calc-presets-label">Quick Add:</span>
          <button
            type="button"
            className="calc-preset-chip"
            onClick={() => handlePresetAdd(1000)}
          >
            +1,000
          </button>
          <button
            type="button"
            className="calc-preset-chip"
            onClick={() => handlePresetAdd(5000)}
          >
            +5,000
          </button>
          <button
            type="button"
            className="calc-preset-chip"
            onClick={() => handlePresetAdd(10000)}
          >
            +10,000
          </button>
          <button
            type="button"
            className="calc-preset-chip"
            onClick={() => handlePresetAdd(25000)}
          >
            +25,000
          </button>
        </div>

        {/* Dial Pad Grid */}
        <div className="calculator-dialpad-grid">
          {/* Row 1 */}
          <button
            type="button"
            className="calc-key calc-key-action"
            onClick={() => handleKeyPress('AC')}
            aria-label="Clear all"
          >
            AC
          </button>
          <button
            type="button"
            className="calc-key calc-key-action"
            onClick={() => handleKeyPress('BACKSPACE')}
            aria-label="Backspace"
          >
            <Delete size={18} />
          </button>
          <button
            type="button"
            className="calc-key calc-key-operator"
            onClick={() => handleKeyPress('÷')}
            aria-label="Divide"
          >
            ÷
          </button>
          <button
            type="button"
            className="calc-key calc-key-operator"
            onClick={() => handleKeyPress('×')}
            aria-label="Multiply"
          >
            ×
          </button>

          {/* Row 2 */}
          <button type="button" className="calc-key" onClick={() => handleKeyPress('7')}>
            7
          </button>
          <button type="button" className="calc-key" onClick={() => handleKeyPress('8')}>
            8
          </button>
          <button type="button" className="calc-key" onClick={() => handleKeyPress('9')}>
            9
          </button>
          <button
            type="button"
            className="calc-key calc-key-operator"
            onClick={() => handleKeyPress('-')}
            aria-label="Minus"
          >
            −
          </button>

          {/* Row 3 */}
          <button type="button" className="calc-key" onClick={() => handleKeyPress('4')}>
            4
          </button>
          <button type="button" className="calc-key" onClick={() => handleKeyPress('5')}>
            5
          </button>
          <button type="button" className="calc-key" onClick={() => handleKeyPress('6')}>
            6
          </button>
          <button
            type="button"
            className="calc-key calc-key-operator"
            onClick={() => handleKeyPress('+')}
            aria-label="Plus"
          >
            +
          </button>

          {/* Row 4 */}
          <button type="button" className="calc-key" onClick={() => handleKeyPress('1')}>
            1
          </button>
          <button type="button" className="calc-key" onClick={() => handleKeyPress('2')}>
            2
          </button>
          <button type="button" className="calc-key" onClick={() => handleKeyPress('3')}>
            3
          </button>
          <button
            type="button"
            className="calc-key calc-key-equals"
            onClick={() => handleKeyPress('=')}
            aria-label="Equals"
          >
            =
          </button>

          {/* Row 5 */}
          <button type="button" className="calc-key" onClick={() => handleKeyPress('0')}>
            0
          </button>
          <button type="button" className="calc-key" onClick={() => handleKeyPress('00')}>
            00
          </button>
          <button type="button" className="calc-key" onClick={() => handleKeyPress('.')}>
            .
          </button>
          <button
            type="button"
            className={`calc-key calc-key-apply ${isExpressionValid ? 'active' : 'disabled'}`}
            onClick={handleApplyClick}
            disabled={!isExpressionValid}
            aria-label="Apply budget amount"
          >
            <Check size={18} />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
