import './DataTable.css';
import React from 'react';
import SkeletonLoader from './SkeletonLoader';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableSelection {
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  selection?: DataTableSelection;
  rowClassName?: (row: T) => string;
  emptyMessage?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

// Generic table shell extracted from the many hand-rolled <table className="table">
// blocks across the page components. Callers keep full control of cell markup via
// `render`; this only standardizes the header/select-all/empty/loading scaffolding.
export default function DataTable<T>({
  columns,
  data,
  rowKey,
  selection,
  rowClassName,
  emptyMessage = 'No records found.',
  loading = false,
  className = '',
}: DataTableProps<T>) {
  const allSelected = !!selection && data.length > 0 && selection.selectedIds.length === data.length;

  if (loading) {
    return <SkeletonLoader type="table" rows={5} cols={columns.length} />;
  }

  return (
    <div className={`data-table-card card ${className}`}>
      <table className="table data-table">
        <thead>
          <tr>
            {selection && (
              <th className="data-table-th-checkbox">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => selection.onSelectAll(e.target.checked)}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} className={col.headerClassName}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selection ? 1 : 0)} className="data-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const id = rowKey(row);
              const selected = selection?.selectedIds.includes(id);
              return (
                <tr key={id} className={`${selected ? 'is-selected' : ''} ${rowClassName?.(row) || ''}`}>
                  {selection && (
                    <td>
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={(e) => selection.onSelectOne(id, e.target.checked)}
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={col.cellClassName}>{col.render(row)}</td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
