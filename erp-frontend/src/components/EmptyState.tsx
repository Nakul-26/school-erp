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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border)',
        boxShadow: 'var(--shadow-sm)',
        maxWidth: '500px',
        margin: '2rem auto'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem'
        }}
      >
        <Icon size={28} />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 1.5rem 0' }}>
        {description}
      </p>
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <button
              className="btn btn-primary"
              onClick={action.onClick}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              className="btn btn-outline"
              onClick={secondaryAction.onClick}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
