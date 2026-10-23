/**
 * All date handling for Daily Budget.
 * Local calendar dates ONLY. Stored as YYYY-MM-DD or YYYY-MM.
 * Never uses toISOString() or UTC for calendar math.
 */

export function formatDateString(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10),
  };
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const parts = monthKey.split('-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
  };
}

export function formatMonthKey(year: number, month: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  return `${y}-${m}`;
}

export function getTodayDate(): string {
  const now = new Date();
  return formatDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return formatMonthKey(now.getFullYear(), now.getMonth() + 1);
}

export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function getDayNumber(dateStr: string): number {
  const { day } = parseDateString(dateStr);
  return day;
}

export function getDaysInMonth(year: number, month: number): number {
  // Day 0 of next month is the last day of the given month in local time
  return new Date(year, month, 0).getDate();
}

export function getDaysInMonthKey(monthKey: string): number {
  const { year, month } = parseMonthKey(monthKey);
  return getDaysInMonth(year, month);
}

export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseDateString(dateStr);
  const target = new Date(year, month - 1, day + days);
  return formatDateString(target.getFullYear(), target.getMonth() + 1, target.getDate());
}

export function getWeekdayLabel(dateStr: string, short: boolean = true): string {
  const { year, month, day } = parseDateString(dateStr);
  const d = new Date(year, month - 1, day);
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = d.getDay();
  return short ? (shortDays[dayIndex] ?? '') : (longDays[dayIndex] ?? '');
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function formatMonthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  const name = MONTH_NAMES[month - 1] ?? '';
  return `${name} ${year}`;
}

export function formatDisplayDate(dateStr: string): string {
  const { year, month, day } = parseDateString(dateStr);
  const weekday = getWeekdayLabel(dateStr, true);
  const monthName = MONTH_SHORT_NAMES[month - 1] ?? '';
  return `${weekday}, ${day} ${monthName} ${year}`;
}

export function getPrevMonth(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  if (month === 1) {
    return formatMonthKey(year - 1, 12);
  }
  return formatMonthKey(year, month - 1);
}

export function getNextMonth(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  if (month === 12) {
    return formatMonthKey(year + 1, 1);
  }
  return formatMonthKey(year, month + 1);
}

export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  try {
    const { year, month, day } = parseDateString(dateStr);
    if (month < 1 || month > 12) return false;
    const maxDays = getDaysInMonth(year, month);
    return day >= 1 && day <= maxDays;
  } catch {
    return false;
  }
}

export function isValidMonthKey(monthKey: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return false;
  try {
    const { month } = parseMonthKey(monthKey);
    return month >= 1 && month <= 12;
  } catch {
    return false;
  }
}
