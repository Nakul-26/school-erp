import React from 'react';
import { Eye, Edit3, Archive, RefreshCw, Trash2, Check, X, Shield } from 'lucide-react';

interface ProgramsTableProps {
  loading: boolean;
  displayedPrograms: any[];
  institutionType: string;
  getProgramLabel: () => string;
  getProgramsLabel: () => string;
  getDeptCode: (deptId: string) => string;
  canManageAcademic: boolean;
  onView: (prog: any) => void;
  onEdit: (prog: any) => void;
  onArchive: (prog: any) => void;
  onRestore: (id: string) => void;
  onDelete: (prog: any) => void;
  onAddClick: () => void;
}

export function ProgramsTable({
  loading, displayedPrograms, institutionType, getProgramLabel, getProgramsLabel, getDeptCode,
  canManageAcademic, onView, onEdit, onArchive, onRestore, onDelete, onAddClick,
}: ProgramsTableProps) {
  return (
    <div className="card classes-program-table-card">
      {loading ? (
        <div className="classes-div-100">Loading...</div>
      ) : (
        <div className="classes-div-101">
          <table className="table classes-table">
            <thead>
              <tr>
                <th className="classes-th-104">Program / Course Overview</th>
                {institutionType !== 'school' && <th className="classes-th-105">Department</th>}
                <th className="classes-th-107">Structure & Config</th>
                <th className="classes-th-109">Status</th>
                <th className="classes-th-110">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedPrograms.map(prog => (
                <tr key={prog.id} className={`classes-tr-111 ${prog.is_active === 0 ? 'archived-row' : ''}`}>
                  <td className="classes-td-114">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{prog.name}</strong>
                        <code className="classes-code-113" style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
                          {prog.course_code}
                        </code>
                        {institutionType !== 'school' && prog.degree_type && (
                          <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>
                            {prog.degree_type}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                        <span>Duration: <strong>{prog.duration_years} {prog.duration_unit || (prog.duration_years === 1 ? 'Year' : 'Years')}</strong></span>
                        {prog.description && (
                          <span>• {prog.description.length > 50 ? prog.description.substring(0, 50) + '...' : prog.description}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  {institutionType !== 'school' && <td className="classes-td-115">{getDeptCode(prog.department_id)}</td>}
                  <td className="classes-td-117">
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', alignItems: 'center' }}>
                      <span title="Semester System" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Semesters: {prog.semester_enabled === 1 ? <Check size={14} color="var(--success)" /> : <X size={14} color="var(--text-muted)" />}
                      </span>
                      <span title="Credit System" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Credits: {prog.credit_system_enabled === 1 ? <Check size={14} color="var(--success)" /> : <X size={14} color="var(--text-muted)" />}
                      </span>
                      <span title="Electives Allowed" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Electives: {prog.electives_enabled === 1 ? <Check size={14} color="var(--success)" /> : <X size={14} color="var(--text-muted)" />}
                      </span>
                    </div>
                  </td>
                  <td className="classes-td-123">
                    <span className={`badge badge-${prog.is_active === 1 ? 'success' : 'secondary'}`}>
                      {prog.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                    </span>
                  </td>
                  <td className="classes-td-124">
                    <div className="classes-row-125">
                      <button onClick={() => onView(prog)} className="btn btn-sm btn-outline classes-btn" title="View Details">
                        <Eye size={12} /> View
                      </button>
                      {canManageAcademic && (
                        prog.is_active === 1 ? (
                          <>
                            <button onClick={() => onEdit(prog)} className="btn btn-sm btn-secondary classes-btn" title="Edit Program">
                              <Edit3 size={12} /> Edit
                            </button>
                            <button onClick={() => onArchive(prog)} className="btn btn-sm btn-outline-danger classes-btn" title="Archive Program">
                              <Archive size={12} /> Archive
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              disabled
                              className="btn btn-sm btn-secondary classes-btn"
                              title="Archived programs are read-only"
                              style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button onClick={() => onRestore(prog.id)} className="btn btn-sm btn-outline-success classes-btn" title="Restore Program">
                              <RefreshCw size={12} /> Restore
                            </button>
                            <button onClick={() => onDelete(prog)} className="btn btn-sm btn-danger classes-btn" title="Delete Unused Program">
                              <Trash2 size={12} /> Delete
                            </button>
                          </>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayedPrograms.length === 0 && (
                <tr>
                  <td colSpan={institutionType === 'school' ? 4 : 5} className="classes-td-130">
                    <div className="classes-col-131">
                      <Shield size={48} color="#cbd5e1" />
                      <h4 className="classes-title-132">No {getProgramsLabel()} Found</h4>
                      <p className="classes-text-133">Try adjusting filters or add a new {getProgramLabel().toLowerCase()}.</p>
                      {canManageAcademic && (
                        <button className="btn btn-primary btn-sm classes-btn" onClick={onAddClick}>
                          Add {getProgramLabel()}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
