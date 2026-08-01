import React from 'react';
import type { Inquiry } from '../admissions.types';
import { DetailRowsTable } from './DetailRowsTable';

interface InquiryDetailModalProps {
  inquiry: Inquiry | null;
  onClose: () => void;
}

export function InquiryDetailModal({ inquiry, onClose }: InquiryDetailModalProps) {
  if (!inquiry) return null;
  const rows: Array<[string, React.ReactNode]> = [
    ['Student Name', inquiry.student_name],
    ['Parent Name', inquiry.parent_name],
    ['Phone', inquiry.parent_phone],
    ['Email', inquiry.parent_email || '—'],
    ['Date of Birth', inquiry.date_of_birth || '—'],
    ['Applying For', inquiry.applying_for_class],
    ['Source', inquiry.source],
    ['Academic Year', inquiry.academic_year_name || '—'],
    ['Notes', inquiry.notes || '—'],
    ['Status', inquiry.status],
    ['Created', new Date(inquiry.created_at).toLocaleString()],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admissions-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Inquiry Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <DetailRowsTable
            rows={rows}
            tableClassName="admissions-table-80"
            trClassName="admissions-tr-81"
            tdLabelClassName="admissions-td-82"
            tdValueClassName="admissions-td-83"
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
