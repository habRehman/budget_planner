import { useState, useEffect, useCallback, useMemo } from 'react';
import { MonthlyBudget, Expense, DayBudget, BudgetRule, BackupData } from '../domain/types';
import { calculateDayBudget, calculateMonthSummary } from '../domain/budget';
import {
  getTodayDate,
  getCurrentMonthKey,
  getMonthKey,
  addDays,
} from '../domain/dates';
import { repository } from '../data/repository';

export function useBudgetData() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate);
  const selectedMonth = useMemo(() => getMonthKey(selectedDate), [selectedDate]);

  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [allBudgets, setAllBudgets] = useState<MonthlyBudget[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storagePersisted, setStoragePersisted] = useState<boolean>(false);

  // Load data for the selected month
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedBudget, fetchedExpenses, fetchedAllBudgets, persisted] = await Promise.all([
        repository.getBudget(selectedMonth),
        repository.getExpensesByMonth(selectedMonth),
        repository.listBudgets(),
        repository.isStoragePersisted(),
      ]);

      setBudget(fetchedBudget ?? null);
      setMonthExpenses(fetchedExpenses);
      setAllBudgets(fetchedAllBudgets);
      setStoragePersisted(persisted);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Derived: Expenses for selected date
  const dayExpenses = useMemo(() => {
    return monthExpenses.filter((e) => e.date === selectedDate);
  }, [monthExpenses, selectedDate]);

  // Derived: Total spent on selected date
  const daySpentTotal = useMemo(() => {
    return dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [dayExpenses]);

  // Derived: Yesterday date & expenses
  const yesterdayDate = useMemo(() => addDays(selectedDate, -1), [selectedDate]);
  const yesterdayExpenses = useMemo(() => {
    return monthExpenses.filter((e) => e.date === yesterdayDate);
  }, [monthExpenses, yesterdayDate]);
  const yesterdaySpentTotal = useMemo(() => {
    return yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [yesterdayExpenses]);

  // Derived: Day budget calculation (single source of truth: calculateDayBudget)
  const dayBudget: DayBudget | null = useMemo(() => {
    if (!budget) return null;
    return calculateDayBudget(budget, monthExpenses, selectedDate);
  }, [budget, monthExpenses, selectedDate]);

  // Derived: Month summary calculation
  const monthSummary = useMemo(() => {
    if (!budget) return null;
    return calculateMonthSummary(budget, monthExpenses, selectedDate);
  }, [budget, monthExpenses, selectedDate]);

  // Navigation actions
  const goToToday = useCallback(() => {
    setSelectedDate(getTodayDate());
  }, []);

  const goToPrevDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, -1));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 1));
  }, []);

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const selectMonth = useCallback((month: string) => {
    const today = getTodayDate();
    if (month === getCurrentMonthKey()) {
      setSelectedDate(today);
    } else {
      setSelectedDate(`${month}-01`);
    }
  }, []);

  // CRUD actions
  const saveBudget = useCallback(
    async (month: string, amount: number, rule: BudgetRule) => {
      const saved = await repository.putBudget({ month, amount, rule });
      await loadData();
      return saved;
    },
    [loadData]
  );

  const addExpense = useCallback(
    async (data: { amount: number; date: string; description?: string; category?: string }) => {
      const created = await repository.createExpense(data);
      await loadData();
      return created;
    },
    [loadData]
  );

  const addMultipleExpenses = useCallback(
    async (items: Array<{ amount: number; date: string; description?: string; category?: string }>) => {
      for (const item of items) {
        await repository.createExpense(item);
      }
      await loadData();
    },
    [loadData]
  );

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
      const updated = await repository.updateExpense(id, updates);
      await loadData();
      return updated;
    },
    [loadData]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      await repository.deleteExpense(id);
      await loadData();
    },
    [loadData]
  );

  const exportData = useCallback(async () => {
    return await repository.exportAllData();
  }, []);

  const importData = useCallback(
    async (backup: BackupData, mode: 'merge' | 'replace') => {
      const result = await repository.importData(backup, mode);
      await loadData();
      return result;
    },
    [loadData]
  );

  const resetAllData = useCallback(async () => {
    await repository.clearAllData();
    await loadData();
  }, [loadData]);

  return {
    selectedDate,
    selectedMonth,
    budget,
    monthExpenses,
    dayExpenses,
    daySpentTotal,
    yesterdayDate,
    yesterdayExpenses,
    yesterdaySpentTotal,
    dayBudget,
    monthSummary,
    allBudgets,
    isLoading,
    storagePersisted,
    goToToday,
    goToPrevDay,
    goToNextDay,
    selectDate,
    selectMonth,
    saveBudget,
    addExpense,
    addMultipleExpenses,
    updateExpense,
    deleteExpense,
    exportData,
    importData,
    resetAllData,
    refresh: loadData,
  };
}
