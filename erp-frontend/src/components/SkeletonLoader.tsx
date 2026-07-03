import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'table' | 'list' | 'chart';
  count?: number;
  rows?: number;
  cols?: number;
}

export default function SkeletonLoader({
  type = 'list',
  count = 1,
  rows = 4,
  cols = 4,
}: SkeletonLoaderProps) {
  const renderCard = () => (
    <div
      className="skeleton-shimmer"
      style={{
        padding: '1.5rem',
        borderRadius: '12px',
        background: '#f1f5f9',
        height: '140px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#cbd5e1' }} />
      <div style={{ width: '60%', height: '16px', borderRadius: '4px', background: '#cbd5e1' }} />
      <div style={{ width: '40%', height: '24px', borderRadius: '4px', background: '#cbd5e1' }} />
    </div>
  );

  const renderTable = () => (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, idx) => (
              <th key={idx} style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div className="skeleton-shimmer" style={{ width: '70px', height: '14px', borderRadius: '4px', background: '#e2e8f0' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx}>
              {Array.from({ length: cols }).map((_, cIdx) => (
                <td key={cIdx} style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <div className="skeleton-shimmer" style={{ width: cIdx === 0 ? '50px' : '90px', height: '14px', borderRadius: '4px', background: '#e2e8f0' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}
        >
          <div className="skeleton-shimmer" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="skeleton-shimmer" style={{ width: '40%', height: '14px', borderRadius: '4px', background: '#e2e8f0' }} />
            <div className="skeleton-shimmer" style={{ width: '75%', height: '12px', borderRadius: '4px', background: '#e2e8f0' }} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderChart = () => (
    <div
      className="skeleton-shimmer"
      style={{
        padding: '1.5rem',
        borderRadius: '12px',
        background: '#f1f5f9',
        height: '220px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        gap: '0.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {[40, 70, 50, 90, 60, 80, 45].map((h, idx) => (
        <div key={idx} style={{ width: '12%', height: `${h}%`, borderRadius: '4px 4px 0 0', background: '#cbd5e1' }} />
      ))}
    </div>
  );

  if (type === 'card') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {Array.from({ length: count }).map((_, idx) => (
          <React.Fragment key={idx}>{renderCard()}</React.Fragment>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return renderTable();
  }

  if (type === 'chart') {
    return renderChart();
  }

  return renderList();
}
