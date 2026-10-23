/**
 * Currency utilities for Pakistani Rupees (PKR / Rs).
 * All money is stored as an integer number of paisa (1 Rupee = 100 paisa).
 * Never uses parseFloat * 100 to avoid IEEE 754 precision issues.
 */

/**
 * Parses user input string into integer paisa.
 * Accepts digits with optional commas and up to 2 decimal places.
 * Max 9 integer digits (up to Rs 999,999,999).
 * Rejects empty, negative, zero, scientific notation, letters, and >2 decimals.
 * Returns integer paisa or null if invalid.
 */
export function parseRupees(input: string): number | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Reject scientific notation, letters, negative signs
  // Match digits with optional comma separators and optional decimal part
  // Comma must be preceded and followed by digits (no leading/trailing comma, no consecutive commas)
  const regex = /^([0-9]+(?:,[0-9]+)*)(?:\.([0-9]{1,2}))?$/;
  const match = trimmed.match(regex);
  if (!match) return null;

  const intRaw = match[1];
  if (!intRaw) return null;

  const intDigits = intRaw.replace(/,/g, '');
  // Max 9 integer digits
  if (intDigits.length === 0 || intDigits.length > 9) return null;

  const intVal = parseInt(intDigits, 10);
  if (Number.isNaN(intVal)) return null;

  const decRaw = match[2];
  let decVal = 0;
  if (decRaw !== undefined) {
    if (decRaw.length === 1) {
      decVal = parseInt(decRaw, 10) * 10;
    } else if (decRaw.length === 2) {
      decVal = parseInt(decRaw, 10);
    }
  }

  const totalPaisa = intVal * 100 + decVal;

  // Rejects zero or negative amounts
  if (totalPaisa <= 0) return null;

  return totalPaisa;
}

/**
 * Formats integer paisa into Pakistani Rupees string using en-PK locale.
 * Example: 64516 -> "Rs 645.16"
 * Negative: -64516 -> "-Rs 645.16"
 */
export function formatRs(paisa: number): string {
  if (!Number.isFinite(paisa)) return 'Rs 0.00';

  const isNegative = paisa < 0;
  const absPaisa = Math.abs(Math.round(paisa));
  const rupees = Math.floor(absPaisa / 100);
  const remPaisa = absPaisa % 100;

  // Thousands grouping formatted via en-PK
  const formattedRupees = new Intl.NumberFormat('en-PK').format(rupees);
  const formattedPaisa = String(remPaisa).padStart(2, '0');

  const prefix = isNegative ? '-Rs ' : 'Rs ';
  return `${prefix}${formattedRupees}.${formattedPaisa}`;
}

/**
 * Splits a total integer paisa amount evenly into N parts.
 * The first (total % parts) shares receive 1 extra paisa.
 * Shares are guaranteed to sum exactly to total.
 */
export function splitEvenly(total: number, parts: number): number[] {
  if (!Number.isInteger(parts) || parts <= 0) return [];
  const base = Math.floor(total / parts);
  const remainder = total % parts;

  const shares: number[] = new Array(parts);
  for (let i = 0; i < parts; i++) {
    shares[i] = base + (i < remainder ? 1 : 0);
  }
  return shares;
}
