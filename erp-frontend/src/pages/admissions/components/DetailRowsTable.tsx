import React from 'react';
import { getBadgeStyle } from '../utils';

interface DetailRowsTableProps {
  rows: Array<[string, React.ReactNode]>;
  tableClassName: string;
  trClassName: string;
  tdLabelClassName: string;
  tdValueClassName: string;
}

// Shared row-rendering for the Inquiry/Application detail modals — both render
// a label/value table where the "Status" row gets rendered as a colored badge.
export function DetailRowsTable({ rows, tableClassName, trClassName, tdLabelClassName, tdValueClassName }: DetailRowsTableProps) {
  return (
    <table className={tableClassName}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className={trClassName}>
            <td className={tdLabelClassName}>{label}</td>
            <td className={tdValueClassName}>
              {label === 'Status' ? (
                <span style={{
                  display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '9999px',
                  fontSize: '0.75rem', fontWeight: 600,
                  background: getBadgeStyle(String(value)).bg,
                  color: getBadgeStyle(String(value)).color,
                }}>{String(value)}</span>
              ) : value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
