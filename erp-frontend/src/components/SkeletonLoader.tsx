import './SkeletonLoader.css';
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
    <div className="skeleton-shimmer skeleton-loader-skeleton-shimmer">
      <div className="skeleton-loader-div-2"  />
      <div className="skeleton-loader-div-3"  />
      <div className="skeleton-loader-div-4"  />
    </div>
  );

  const renderTable = () => (
    <div className="skeleton-loader-div-5">
      <table className="skeleton-loader-table-6">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, idx) => (
              <th key={idx} className="skeleton-loader-th-7">
                <div className="skeleton-shimmer skeleton-loader-skeleton-shimmer"  />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx}>
              {Array.from({ length: cols }).map((_, cIdx) => (
                <td key={cIdx} className="skeleton-loader-td-9">
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
    <div className="skeleton-loader-col-10">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-loader-row-11">
          <div className="skeleton-shimmer skeleton-loader-skeleton-shimmer"  />
          <div className="skeleton-loader-col-13">
            <div className="skeleton-shimmer skeleton-loader-skeleton-shimmer"  />
            <div className="skeleton-shimmer skeleton-loader-skeleton-shimmer"  />
          </div>
        </div>
      ))}
    </div>
  );

  const renderChart = () => (
    <div className="skeleton-shimmer skeleton-loader-skeleton-shimmer">
      {[40, 70, 50, 90, 60, 80, 45].map((h, idx) => (
        <div key={idx} style={{ width: '12%', height: `${h}%`, borderRadius: '4px 4px 0 0', background: '#cbd5e1' }} />
      ))}
    </div>
  );

  if (type === 'card') {
    return (
      <div className="skeleton-loader-grid-17">
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
