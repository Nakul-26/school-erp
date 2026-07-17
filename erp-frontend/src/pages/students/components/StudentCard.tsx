import React from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Calendar, Check, Trash2, IndianRupee } from 'lucide-react';

interface StudentCardProps {
  student: any;
  selectedStudentIds: string[];
  handleSelectOne: (id: string, checked: boolean) => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  handleOpenEditModal: (student: any) => void;
  handleReactivateStudent: (id: string, name: string) => void;
  handleArchiveStudent: (id: string, name: string) => void;
  handleDeleteStudent: (id: string, name: string) => void;
  canEditStudent: boolean;
  canDeleteStudent: boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  selectedStudentIds,
  handleSelectOne,
  activeMenuId,
  setActiveMenuId,
  handleOpenEditModal,
  handleReactivateStudent,
  handleArchiveStudent,
  handleDeleteStudent,
  canEditStudent,
  canDeleteStudent,
}) => {
  const isSelected = selectedStudentIds.includes(student.id);

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return (first + last).toUpperCase();
  };

  const getFullName = () => {
    return `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name || ''}`;
  };

  return (
    <div 
      className={`card students-card-new ${isSelected ? 'is-selected' : ''}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('input[type="checkbox"]') || target.closest('.dropdown-menu')) {
          return;
        }
        handleSelectOne(student.id, !isSelected);
      }}
    >
      {/* Select Checkbox */}
      <div className="students-div-39" onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          checked={isSelected} 
          onChange={e => handleSelectOne(student.id, e.target.checked)} 
          className="students-input-40"  
        />
      </div>

      {/* Header: Avatar + Status */}
      <div className="students-card-header">
        <div className="students-card-avatar">
          {student.photo ? (
            <img 
              src={student.photo.startsWith('data:image') || student.photo.startsWith('/api') || student.photo.startsWith('http')
                ? student.photo 
                : `/api/students/photo/${student.id}`} 
              alt="" 
            />
          ) : (
            <div className="students-card-avatar-initials">
              {getInitials(student.first_name, student.last_name)}
            </div>
          )}
        </div>
        
        <span className={`students-card-status ${student.status === 'ACTIVE' || student.status === 'GRADUATED' ? 'is-active' : ''}`}>
          {student.status}
        </span>
      </div>

      {/* Name and Admission Number */}
      <div className="students-card-identity">
        <h4 className="students-card-name">
          {getFullName()}
        </h4>
        <span className="students-card-admission">
          #{student.admission_number}
        </span>
      </div>

      {/* Secondary Line: Class & Section */}
      <div className="students-card-academic">
        {student.program_name || 'Unassigned'}{student.section_name ? ` • ${student.section_name}` : ''}
      </div>

      {/* Subtle Separator */}
      <div className="students-card-divider" />

      {/* Metrics Row */}
      <div className="students-card-metrics">
        <div className="students-card-metric-col">
          <span className={`students-card-metric-value ${student.attendance_percentage >= 75 ? 'attendance-good' : student.attendance_percentage === 100 && student.total_sessions === 0 ? 'attendance-muted' : 'attendance-warning'}`}>
            {student.attendance_percentage}%
          </span>
          <span className="students-card-metric-label">
            Attendance
          </span>
        </div>
        <div className="students-card-metric-col align-right">
          <span className={`students-card-metric-value ${student.fee_due === 0 ? 'fee-none' : student.fee_due < 10000 ? 'fee-low' : 'fee-high'}`}>
            ₹{(student.fee_due || 0).toLocaleString('en-IN')}
          </span>
          <span className="students-card-metric-label">
            Fee Due
          </span>
        </div>
      </div>

      {/* Subtle Separator */}
      <div className="students-card-divider" />

      {/* Footer Action Buttons */}
      <div className="students-card-footer" onClick={(e) => e.stopPropagation()}>
        <Link to={`/students/${student.id}?tab=overview`} className="students-card-view-link">
          View
        </Link>
        
        <div className="student-menu-container">
          <button 
            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === student.id ? null : student.id); }} 
            className="students-card-more-btn"
            title="More Actions"
          >
            ⋮
          </button>
          {activeMenuId === student.id && (
            <div className="dropdown-menu students-dropdown-menu">
              {canEditStudent && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleOpenEditModal(student); }} 
                  className="dropdown-item students-dropdown-item" 
                >
                  <Edit2 size={14} /> Edit Profile
                </button>
              )}
              <Link to={`/students/${student.id}?tab=attendance`} className="dropdown-item students-dropdown-item">
                <Calendar size={14} /> Attendance
              </Link>
              <Link to={`/students/${student.id}?tab=results`} className="dropdown-item students-dropdown-item">
                <Calendar size={14} /> Exam Results
              </Link>
              <Link to={`/students/${student.id}?tab=fees`} className="dropdown-item students-dropdown-item">
                <IndianRupee size={14} /> Fee Ledger
              </Link>
              <div className="students-dropdown-divider" />
              {canEditStudent && (student.status === 'DROPPED' ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleReactivateStudent(student.id, getFullName()); }} 
                  className="dropdown-item students-dropdown-item text-success" 
                >
                  Reactivate Profile
                </button>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleArchiveStudent(student.id, getFullName()); }} 
                  className="dropdown-item students-dropdown-item text-warning" 
                >
                  Deactivate / Archive
                </button>
              ))}
              {canDeleteStudent && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id, getFullName()); }} 
                  className="dropdown-item students-dropdown-item text-danger"
                >
                  <Trash2 size={14} /> Delete Permanently
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
