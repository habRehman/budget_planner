import React, { useState, useRef } from 'react';
import { MonthlyBudget, BudgetRule, BackupData, Expense } from '../domain/types';
import { formatRs, parseRupees } from '../domain/money';
import { formatMonthLabel } from '../domain/dates';
import {
  generateBackupFilename,
  generateCsvFilename,
  expensesToCsv,
  downloadFile,
  parseBackupJson,
} from '../domain/backup';
import {
  ShieldCheck,
  Download,
  Upload,
  RotateCcw,
  HardDrive,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  Sun,
  Moon,
  Calculator,
} from 'lucide-react';
import { CalculatorModal } from './CalculatorModal';

interface SettingsProps {
  currentMonth: string;
  currentBudget: MonthlyBudget | null;
  allBudgets: MonthlyBudget[];
  expenses: Expense[];
  storagePersisted: boolean;
  onSaveBudget: (month: string, amount: number, rule: BudgetRule) => Promise<unknown>;
  onExportBackup: () => Promise<BackupData>;
  onImportBackup: (backup: BackupData, mode: 'merge' | 'replace') => Promise<{ importedBudgets: number; importedExpenses: number }>;
  onResetAllData: () => Promise<void>;
  onTriggerToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onRequestPersistence: () => Promise<boolean>;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  currentMonth,
  currentBudget,
  allBudgets,
  expenses,
  storagePersisted,
  onSaveBudget,
  onExportBackup,
  onImportBackup,
  onResetAllData,
  onTriggerToast,
  onRequestPersistence,
  theme = 'light',
  onToggleTheme,
}) => {
  // Budget edit state
  const [budgetAmountInput, setBudgetAmountInput] = useState(
    currentBudget ? (currentBudget.amount / 100).toString() : ''
  );
  const [budgetRule, setBudgetRule] = useState<BudgetRule>(currentBudget?.rule ?? 'flex');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Reset state
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Storage persistence state
  const [persisted, setPersisted] = useState(storagePersisted);

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const paisa = parseRupees(budgetAmountInput);
    if (!paisa) {
      onTriggerToast('error', 'Please enter a valid positive budget amount in Rupees.');
      return;
    }

    try {
      setIsSavingBudget(true);
      await onSaveBudget(currentMonth, paisa, budgetRule);
      onTriggerToast('success', `Updated budget for ${formatMonthLabel(currentMonth)} to ${formatRs(paisa)}`);
    } catch (err) {
      onTriggerToast('error', err instanceof Error ? err.message : 'Failed to update budget.');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleExportJson = async () => {
    try {
      const backup = await onExportBackup();
      const json = JSON.stringify(backup, null, 2);
      const filename = generateBackupFilename();
      downloadFile(json, filename, 'application/json');
      onTriggerToast('success', `Exported backup as ${filename}`);
    } catch {
      onTriggerToast('error', 'Failed to export backup file.');
    }
  };

  const handleExportCsv = () => {
    try {
      const csv = expensesToCsv(expenses);
      const filename = generateCsvFilename(currentMonth);
      downloadFile(csv, filename, 'text/csv');
      onTriggerToast('success', `Exported ${expenses.length} expenses to ${filename}`);
    } catch {
      onTriggerToast('error', 'Failed to export CSV.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseBackupJson(content);
      if (!res.isValid || !res.data) {
        onTriggerToast('error', res.error ?? 'Invalid backup file');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setPendingBackup(res.data);
      setImportSummary(
        `Found ${res.data.budgets.length} budget(s) and ${res.data.expenses.length} expense(s) in backup file.`
      );
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async (mode: 'merge' | 'replace') => {
    if (!pendingBackup) return;
    try {
      const res = await onImportBackup(pendingBackup, mode);
      onTriggerToast(
        'success',
        `Imported successfully! (${res.importedBudgets} budgets, ${res.importedExpenses} expenses).`
      );
      setIsImportModalOpen(false);
      setPendingBackup(null);
    } catch (err) {
      onTriggerToast('error', err instanceof Error ? err.message : 'Import failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRequestPersistence = async () => {
    const success = await onRequestPersistence();
    setPersisted(success);
    if (success) {
      onTriggerToast('success', 'Storage persistence granted! Your budget data will not be evicted.');
    } else {
      onTriggerToast('info', 'Storage persistence request declined or not supported by browser.');
    }
  };

  const handleResetConfirm = async () => {
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') {
      onTriggerToast('error', 'Please type RESET to confirm data deletion.');
      return;
    }
    await onResetAllData();
    setIsResetDialogOpen(false);
    setResetConfirmText('');
    onTriggerToast('success', 'All budget data wiped cleanly.');
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2 className="settings-title">App Settings & Data</h2>
        <p className="settings-desc">Manage your monthly budget, data backups, and offline storage.</p>
      </div>

      {/* Theme & Appearance */}
      {onToggleTheme && (
        <section className="card settings-section">
          <h3 className="section-title">Theme & Appearance</h3>
          <p className="section-desc">Choose between crisp light theme and dark navy theme.</p>
          <div className="toggle-tab-group" style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
            <button
              type="button"
              className={`toggle-tab ${theme === 'light' ? 'active' : ''}`}
              onClick={() => {
                if (theme !== 'light') onToggleTheme();
              }}
            >
              <Sun size={16} />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              className={`toggle-tab ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => {
                if (theme !== 'dark') onToggleTheme();
              }}
            >
              <Moon size={16} />
              <span>Dark Mode</span>
            </button>
          </div>
        </section>
      )}

      {/* 1. Monthly Budget Configuration */}
      <section className="card settings-section">
        <h3 className="section-title">Budget for {formatMonthLabel(currentMonth)}</h3>
        <p className="section-desc">
          Editing this budget keeps all your recorded expenses and recalculates daily allowances for this month only.
        </p>

        <form onSubmit={handleUpdateBudget} className="settings-form">
          <div className="form-group">
            <div className="label-with-action">
              <label htmlFor="settings-budget-amount" className="form-label">
                Monthly Budget (Rupees)
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-xs calc-launch-btn"
                onClick={() => setIsCalcModalOpen(true)}
                aria-label="Open Calculator Dial Pad"
                title="Open Calculator Dial Pad"
              >
                <Calculator size={13} className="text-accent" />
                <span>Calculator Dial Pad</span>
              </button>
            </div>
            <div className="input-prefix-wrapper">
              <span className="input-prefix">Rs</span>
              <input
                id="settings-budget-amount"
                type="text"
                inputMode="decimal"
                className="form-input font-bold"
                placeholder="e.g. 50,000"
                value={budgetAmountInput}
                onChange={(e) => setBudgetAmountInput(e.target.value)}
                onClick={() => setIsCalcModalOpen(true)}
                required
              />
              <button
                type="button"
                className="input-suffix-calc-btn"
                onClick={() => setIsCalcModalOpen(true)}
                aria-label="Open Calculator Dial Pad"
                title="Calculate budget with dial pad"
              >
                <Calculator size={18} />
              </button>
            </div>
            <span className="form-hint">
              Tap input or calculator icon to open the calculation dial pad.
            </span>
          </div>

          <div className="form-group">
            <span className="form-label">Calculation Rule</span>
            <div className="radio-tile-group">
              <label className={`radio-tile ${budgetRule === 'flex' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="settings-rule"
                  value="flex"
                  checked={budgetRule === 'flex'}
                  onChange={() => setBudgetRule('flex')}
                />
                <div className="radio-tile-content">
                  <span className="radio-tile-title">Flexible</span>
                  <span className="radio-tile-desc">
                    Re-allocates remaining funds across remaining days dynamically.
                  </span>
                </div>
              </label>

              <label className={`radio-tile ${budgetRule === 'fixed' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="settings-rule"
                  value="fixed"
                  checked={budgetRule === 'fixed'}
                  onChange={() => setBudgetRule('fixed')}
                />
                <div className="radio-tile-content">
                  <span className="radio-tile-title">Fixed</span>
                  <span className="radio-tile-desc">
                    Equal daily nominal allowance. Unspent funds do not roll over.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSavingBudget}
          >
            <Check size={16} />
            <span>{isSavingBudget ? 'Saving...' : 'Update Budget'}</span>
          </button>
        </form>
      </section>

      {/* Monthly Budget History */}
      <section className="card settings-section">
        <h3 className="section-title">Monthly Budget History</h3>
        <p className="section-desc">
          Configured monthly budgets stored in this device ({allBudgets.length} total).
        </p>

        {allBudgets.length === 0 ? (
          <p className="text-muted text-sm">No monthly budgets configured yet.</p>
        ) : (
          <ul className="budget-history-list" aria-label="Budget history">
            {allBudgets.map((b) => (
              <li key={b.month} className="history-row">
                <div className="history-row-date">
                  <span className="font-bold">{formatMonthLabel(b.month)}</span>
                  <span className="text-muted text-sm">{b.month}</span>
                </div>
                <div className="history-figure-col">
                  <span className="history-col-label">Budget</span>
                  <span className="font-bold">{formatRs(b.amount)}</span>
                </div>
                <div>
                  <span className="badge badge-neutral uppercase">{b.rule}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. Backup & Export */}
      <section className="card settings-section">
        <h3 className="section-title">Data Backup & Export</h3>
        <p className="section-desc">
          Export your records to keep a safe offline copy, or import on another device.
        </p>

        <div className="settings-action-buttons">
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleExportJson}
          >
            <Download size={18} />
            <span>Export Full JSON Backup</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleExportCsv}
          >
            <FileSpreadsheet size={18} />
            <span>Export {formatMonthLabel(currentMonth)} CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} />
            <span>Import Backup File (JSON)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </section>

      {/* 3. Storage & Privacy */}
      <section className="card settings-section">
        <h3 className="section-title">Offline Storage & Privacy</h3>
        <div className="storage-status-row">
          <HardDrive size={18} className="text-accent" />
          <div className="storage-status-info">
            <span className="font-bold">IndexedDB Persistent Storage</span>
            <span className="text-muted text-sm">
              Status: {persisted ? 'Persisted (Safe from eviction)' : 'Standard storage'}
            </span>
          </div>
          {!persisted && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRequestPersistence}
            >
              Request Persistence
            </button>
          )}
        </div>

        <div className="privacy-note">
          <ShieldCheck size={16} className="text-accent" />
          <span>
            <strong>100% Private:</strong> All your data is stored locally on this device in IndexedDB.
            There are no servers, analytics, remote cookies, or trackers.
          </span>
        </div>
      </section>

      {/* 4. Danger Zone - Reset Data */}
      <section className="card settings-section settings-danger-zone">
        <div className="danger-header">
          <AlertTriangle size={20} className="text-danger" />
          <div>
            <h3 className="section-title text-danger">Reset All Data</h3>
            <p className="section-desc text-danger">
              Permanently wipe all budgets and expense history from this device.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-danger"
          onClick={() => setIsResetDialogOpen(true)}
        >
          <RotateCcw size={16} />
          <span>Reset All Data</span>
        </button>
      </section>

      {/* Import Modal */}
      {isImportModalOpen && pendingBackup && (
        <div className="modal-backdrop" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirm Backup Import</h2>
            </div>
            <div className="modal-body">
              <p className="modal-message">{importSummary}</p>
              <p className="text-muted text-sm mt-2">
                Choose how you want to apply this backup:
              </p>
              <div className="import-choice-list">
                <button
                  type="button"
                  className="btn btn-secondary btn-block text-left"
                  onClick={() => void handleExecuteImport('merge')}
                >
                  <strong>Merge:</strong> Keep existing records and skip any duplicate IDs.
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-block text-left mt-2"
                  onClick={() => void handleExecuteImport('replace')}
                >
                  <strong>Replace All:</strong> Wipe all current records and restore backup.
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsImportModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {isResetDialogOpen && (
        <div className="modal-backdrop" onClick={() => setIsResetDialogOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title text-danger">Type RESET to Confirm</h2>
            </div>
            <div className="modal-body">
              <p className="modal-message">
                This will irreversibly delete all your budgets and expenses stored on this device.
                Please type <strong>RESET</strong> below to confirm.
              </p>
              <input
                type="text"
                className="form-input text-danger font-bold mt-3"
                placeholder="RESET"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsResetDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={resetConfirmText.trim().toUpperCase() !== 'RESET'}
                onClick={() => void handleResetConfirm()}
              >
                Permanently Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculator Dial Pad Modal */}
      <CalculatorModal
        isOpen={isCalcModalOpen}
        title={`Budget Calculator`}
        initialValue={budgetAmountInput}
        monthLabel={formatMonthLabel(currentMonth)}
        onClose={() => setIsCalcModalOpen(false)}
        onApply={(amountInRupees) => {
          setBudgetAmountInput(amountInRupees.toLocaleString('en-US'));
        }}
      />
    </div>
  );
};
