import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
    icon?: LucideIcon;
  };
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
  isPrimary?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
  onClick,
  className = '',
  isPrimary = false,
}) => {
  const isInteractive = Boolean(onClick);

  return (
    <div
      className={`stat-card ${isPrimary ? 'stat-card-primary' : ''} ${
        isInteractive ? 'stat-card-interactive' : ''
      } ${className}`}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="stat-card-header">
        <div className="stat-card-title-group">
          {Icon && <Icon size={18} className="stat-card-icon" />}
          <span className="stat-card-title">{title}</span>
        </div>
        {badge && (
          <span className={`badge badge-${badge.variant}`}>
            {badge.icon && <badge.icon size={12} className="badge-icon" />}
            <span>{badge.text}</span>
          </span>
        )}
      </div>

      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
      </div>

      {isInteractive && (
        <div className="stat-card-footer">
          <span className="stat-card-link-text">View details</span>
          <ChevronRight size={16} />
        </div>
      )}
    </div>
  );
};
