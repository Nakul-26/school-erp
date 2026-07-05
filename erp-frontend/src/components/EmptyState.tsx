import './EmptyState.css';
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: any;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  title,
  description,
  icon: Icon = AlertCircle,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="empty-state-col-1">
      <div className="empty-state-row-2">
        <Icon size={28} />
      </div>
      <h3 className="empty-state-title-3">
        {title}
      </h3>
      <p className="empty-state-text-4">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="empty-state-row-5">
          {action && (
            <button className="btn btn-primary empty-state-btn" onClick={action.onClick}>
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button className="btn btn-outline empty-state-btn" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
