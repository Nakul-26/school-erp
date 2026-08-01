import React from 'react';
import { Archive, Check, Trash2 } from 'lucide-react';

interface BulkActionsBarProps {
  show: boolean;
  selectedCount: number;
  canManageAcademic: boolean;
  onAssignTeacherClick: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  onExportCsv: () => void;
}

export function BulkActionsBar({ show, selectedCount, canManageAcademic, onAssignTeacherClick, onDeactivate, onReactivate, onDelete, onExportCsv }: BulkActionsBarProps) {
  if (!show) return null;
  return (
    <div className="classes-bulk-bar animate-slide-in">
      <span className="classes-bulk-info">
        <strong>{selectedCount}</strong> {selectedCount === 1 ? 'class/section' : 'classes/sections'} selected
      </span>
      <div className="classes-bulk-actions">
        {canManageAcademic && (
          <>
            <button onClick={onAssignTeacherClick} className="btn btn-sm btn-outline" title="Assign Class Teacher">
              Assign Class Teacher
            </button>
            <button onClick={onDeactivate} className="btn btn-sm btn-outline text-warning">
              <Archive size={14} /> Deactivate
            </button>
            <button onClick={onReactivate} className="btn btn-sm btn-outline text-success">
              <Check size={14} /> Reactivate
            </button>
            <button onClick={onDelete} className="btn btn-sm btn-danger">
              <Trash2 size={14} /> Delete
            </button>
          </>
        )}
        <div className="classes-bulk-divider" />
        <button onClick={onExportCsv} className="btn btn-sm btn-outline">
          Export CSV
        </button>
      </div>
    </div>
  );
}
