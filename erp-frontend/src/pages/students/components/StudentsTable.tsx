import React from 'react';
import { getAuthenticatedUrl } from '../../../services/api';
import { Link } from 'react-router-dom';
import { Edit2, Check, Archive, Trash2 } from 'lucide-react';

interface StudentsTableProps {
  students: any[];
  selectedStudentIds: string[];
  handleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectOne: (id: string, checked: boolean) => void;
  handleOpenEditModal: (student: any) => void;
  handleReactivateStudent: (id: string, name: string) => void;
  handleArchiveStudent: (id: string, name: string) => void;
  handleDeleteStudent: (id: string, name: string) => void;
  getProgramLabel: () => string;
  canEditStudent: boolean;
  canDeleteStudent: boolean;
}

export const StudentsTable: React.FC<StudentsTableProps> = ({
  students,
  selectedStudentIds,
  handleSelectAll,
  handleSelectOne,
  handleOpenEditModal,
  handleReactivateStudent,
  handleArchiveStudent,
  handleDeleteStudent,
  getProgramLabel,
  canEditStudent,
  canDeleteStudent,
}) => {
  const allSelected = selectedStudentIds.length === students.length && students.length > 0;

  const getFullName = (s: any) => {
    return `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name || ''}`;
  };

  return (
    <div className="card students-table-card">
      <table className="table">
        <thead>
          <tr>
            <th className="students-th-65">
              <input 
                type="checkbox" 
                checked={allSelected} 
                onChange={handleSelectAll} 
              />
            </th>
            <th>Adm. No</th>
            <th>Roll No</th>
            <th>Name</th>
            <th>{getProgramLabel()} & Section</th>
            <th>Attendance</th>
            <th>Fee Due</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.id} className={selectedStudentIds.includes(s.id) ? 'is-selected' : ''}>
              <td>
                <input 
                  type="checkbox" 
                  checked={selectedStudentIds.includes(s.id)} 
                  onChange={e => handleSelectOne(s.id, e.target.checked)} 
                />
              </td>
              <td><strong>{s.admission_number}</strong></td>
              <td>{s.roll_number || '-'}</td>
              <td>
                <div className="students-row-66">
                  <div className="students-table-avatar-circle">
                    {s.photo ? (
                      <img 
                        src={getAuthenticatedUrl(
                          s.photo.startsWith('data:image') || s.photo.startsWith('/api') || s.photo.startsWith('http')
                            ? s.photo 
                            : `/api/students/photo/${s.id}`
                        )} 
                        alt="" 
                        className="students-table-avatar-circle-img" 
                      />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <span>{getFullName(s)}</span>
                </div>
              </td>
              <td>{s.program_name ? `${s.program_name} • ${s.section_name || 'A'}` : 'Unassigned'}</td>
              <td>
                <span className={`students-table-attendance ${s.attendance_percentage >= 75 ? 'attendance-good' : 'attendance-warning'}`}>
                  {s.attendance_percentage}%
                </span>
              </td>
              <td>
                <span className={`students-table-fee ${s.fee_due > 0 ? 'fee-due' : 'fee-none'}`}>
                  ₹{(s.fee_due || 0).toLocaleString('en-IN')}
                </span>
              </td>
              <td>
                <span className={`badge badge-${s.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                  {s.status}
                </span>
              </td>
              <td>
                <div className="students-row-67">
                  <Link to={`/students/${s.id}`} className="btn btn-sm btn-outline students-btn-table-action">View</Link>
                  {canEditStudent && <button onClick={() => handleOpenEditModal(s)} className="btn btn-sm btn-outline students-btn-table-action" title="Edit Record"><Edit2 size={12} /></button>}
                  {canEditStudent && (s.status === 'DROPPED' ? (
                    <button onClick={() => handleReactivateStudent(s.id, getFullName(s))} className="btn btn-sm btn-outline students-btn-table-action students-btn-table-reactivate" title="Reactivate Student"><Check size={12} /></button>
                  ) : (
                    <button onClick={() => handleArchiveStudent(s.id, getFullName(s))} className="btn btn-sm btn-outline students-btn-table-action students-btn-table-archive" title="Archive Student"><Archive size={12} /></button>
                  ))}
                  {canDeleteStudent && <button onClick={() => handleDeleteStudent(s.id, getFullName(s))} className="btn btn-sm btn-danger students-btn-table-action students-btn-table-delete" title="Delete Permanently"><Trash2 size={12} /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
