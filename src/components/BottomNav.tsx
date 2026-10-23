import React from 'react';
import { LayoutDashboard, History, Settings, Plus } from 'lucide-react';

export type NavTab = 'dashboard' | 'history' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onAddClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  onAddClick,
}) => {
  return (
    <nav className="bottom-nav" aria-label="Main Navigation">
      <div className="bottom-nav-inner">
        <button
          type="button"
          className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
          aria-label="Dashboard"
        >
          <LayoutDashboard size={20} />
          <span className="nav-label">Dashboard</span>
        </button>

        <button
          type="button"
          className={`nav-item ${currentTab === 'history' ? 'active' : ''}`}
          onClick={() => onTabChange('history')}
          aria-label="History"
        >
          <History size={20} />
          <span className="nav-label">History</span>
        </button>

        {/* Central Add Expense Button */}
        <button
          type="button"
          className="nav-add-btn"
          onClick={onAddClick}
          aria-label="Add new expense"
        >
          <Plus size={24} />
        </button>

        <button
          type="button"
          className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
          aria-label="Settings"
        >
          <Settings size={20} />
          <span className="nav-label">Settings</span>
        </button>
      </div>
    </nav>
  );
};
