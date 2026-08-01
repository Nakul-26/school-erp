import React from 'react';
import type { Application } from '../admissions.types';
import { DetailRowsTable } from './DetailRowsTable';

interface ApplicationDetailModalProps {
  application: Application | null;
  onClose: () => void;
}

export function ApplicationDetailModal({ application, onClose }: ApplicationDetailModalProps) {
  if (!application) return null;
  const rows: Array<[string, React.ReactNode]> = [
    ['Student Name', `${application.student_first_name} ${application.student_last_name}`],
    ['Date of Birth', application.date_of_birth || '—'],
    ['Gender', application.gender || '—'],
    ['Course / Program', application.course_name || '—'],
    ['Academic Year', application.academic_year_name],
    ['Parent Name', application.parent_name],
    ['Parent Phone', application.parent_phone],
    ['Parent Email', application.parent_email || '—'],
    ['Previous School', application.previous_school || '—'],
    ['Previous Class', application.previous_class || '—'],
    ['Status', application.status],
    ['Rejection Reason', application.rejection_reason || '—'],
    ['Approved At', application.approved_at ? new Date(application.approved_at).toLocaleString() : '—'],
    ['Applied On', new Date(application.created_at).toLocaleString()],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admissions-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Application Details</h3>
            <code className="admissions-code-105">{application.application_number}</code>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <DetailRowsTable
            rows={rows}
            tableClassName="admissions-table-106"
            trClassName="admissions-tr-107"
            tdLabelClassName="admissions-td-108"
            tdValueClassName="admissions-td-109"
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
