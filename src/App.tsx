import { useState } from 'react';
import { useBudgetData } from './state/useBudgetData';
import { repository } from './data/repository';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { Settings } from './components/Settings';
import { DayView } from './components/DayView';
import { ExpenseSheet } from './components/ExpenseSheet';
import { BottomNav, NavTab } from './components/BottomNav';
import { Toast, ToastMessage } from './components/Toast';
import { InstallPrompt } from './components/InstallPrompt';
import { Expense } from './domain/types';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const data = useBudgetData();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeDayViewDate, setActiveDayViewDate] = useState<string | null>(null);

  // Expense sheet state
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Toast state
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Theme state (default to light)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('budget_theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('budget_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    const meta = document.getElementById('theme-color-meta');
    if (meta) {
      meta.setAttribute('content', next === 'dark' ? '#0b132b' : '#f8fafc');
    }
  };

  const triggerToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      text,
    });
  };

  // PWA Service Worker update prompt
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Periodically check for updates
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
  });

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setIsExpenseSheetOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseSheetOpen(true);
  };

  const handleSaveSingleExpense = async (expData: {
    id?: string;
    amount: number;
    date: string;
    description?: string;
    category?: string;
  }) => {
    if (expData.id) {
      await data.updateExpense(expData.id, {
        amount: expData.amount,
        date: expData.date,
        description: expData.description,
        category: expData.category,
      });
      triggerToast('success', 'Expense updated successfully.');
    } else {
      await data.addExpense(expData);
      triggerToast('success', 'Expense recorded successfully.');
    }
  };

  const handleSaveMultipleExpenses = async (
    items: Array<{ amount: number; date: string; description?: string; category?: string }>
  ) => {
    await data.addMultipleExpenses(items);
    triggerToast('success', `Recorded ${items.length} expenses successfully.`);
  };

  const handleDeleteExpense = async (id: string) => {
    await data.deleteExpense(id);
    triggerToast('success', 'Expense deleted.');
  };

  const handleOpenDayView = (date: string) => {
    setActiveDayViewDate(date);
  };

  const handleBackFromDayView = () => {
    setActiveDayViewDate(null);
  };

  return (
    <div className="app-layout">
      {/* PWA Update Notification Toast (Non-blocking, never auto-reload while sheet is open) */}
      {needRefresh && !isExpenseSheetOpen && (
        <aside className="pwa-update-bar" role="status" aria-live="polite">
          <div className="pwa-update-content">
            <RefreshCw size={16} className="spin-slow text-accent" />
            <span>Update available. Reload to get the latest version.</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => void updateServiceWorker(true)}
          >
            Reload
          </button>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        <InstallPrompt />

        {activeDayViewDate ? (
          <DayView
            date={activeDayViewDate}
            dayBudget={data.dayBudget}
            expenses={data.monthExpenses.filter((e) => e.date === activeDayViewDate)}
            onBack={handleBackFromDayView}
            onAddExpense={handleOpenAddExpense}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        ) : activeTab === 'dashboard' ? (
          <Dashboard
            selectedDate={data.selectedDate}
            selectedMonth={data.selectedMonth}
            budget={data.budget}
            dayBudget={data.dayBudget}
            dayExpenses={data.dayExpenses}
            daySpentTotal={data.daySpentTotal}
            yesterdayDate={data.yesterdayDate}
            yesterdaySpentTotal={data.yesterdaySpentTotal}
            monthSummary={data.monthSummary}
            onSelectDate={data.selectDate}
            onSelectMonth={data.selectMonth}
            onPrevDay={data.goToPrevDay}
            onNextDay={data.goToNextDay}
            onGoToToday={data.goToToday}
            onOpenDayView={handleOpenDayView}
            onOpenAddExpense={handleOpenAddExpense}
            onOpenSettings={() => setActiveTab('settings')}
            onSaveBudget={data.saveBudget}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        ) : activeTab === 'history' ? (
          <History
            currentMonth={data.selectedMonth}
            budget={data.budget}
            expenses={data.monthExpenses}
            onSelectMonth={data.selectMonth}
            onOpenDayView={handleOpenDayView}
            onSetBudgetClick={() => setActiveTab('settings')}
          />
        ) : (
          <Settings
            currentMonth={data.selectedMonth}
            currentBudget={data.budget}
            allBudgets={data.allBudgets}
            expenses={data.monthExpenses}
            storagePersisted={data.storagePersisted}
            onSaveBudget={data.saveBudget}
            onExportBackup={data.exportData}
            onImportBackup={data.importData}
            onResetAllData={data.resetAllData}
            onTriggerToast={triggerToast}
            onRequestPersistence={repository.requestPersistentStorage.bind(repository)}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={activeTab}
        onTabChange={(tab) => {
          setActiveDayViewDate(null);
          setActiveTab(tab);
        }}
        onAddClick={handleOpenAddExpense}
      />

      {/* Expense Sheet (Add / Edit) */}
      <ExpenseSheet
        isOpen={isExpenseSheetOpen}
        initialDate={activeDayViewDate ?? data.selectedDate}
        editingExpense={editingExpense}
        onClose={() => {
          setIsExpenseSheetOpen(false);
          setEditingExpense(null);
        }}
        onSaveSingle={handleSaveSingleExpense}
        onSaveMultiple={handleSaveMultipleExpenses}
      />

      {/* Accessible Global Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
