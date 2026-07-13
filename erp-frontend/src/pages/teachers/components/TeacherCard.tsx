import React from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Calendar, Mail, Phone, Trash2 } from 'lucide-react';

interface TeacherCardProps {
  teacher: any;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  handleEditClick: (teacher: any) => void;
  handleDeleteTeacher: (id: string, name: string) => void;
}

export const TeacherCard: React.FC<TeacherCardProps> = ({
  teacher,
  activeMenuId,
  setActiveMenuId,
  handleEditClick,
  handleDeleteTeacher,
}) => {
  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return (first + last).toUpperCase();
  };

  const getFullName = () => {
    return `${teacher.first_name} ${teacher.middle_name ? teacher.middle_name + ' ' : ''}${teacher.last_name || ''}`;
  };

  return (
    <div className="card teachers-card-new">
      {/* Header: Avatar + Status */}
      <div className="teachers-card-header">
        <div className="teachers-card-avatar">
          {teacher.photo ? (
            <img 
              src={teacher.photo.startsWith('data:image') || teacher.photo.startsWith('/api') || teacher.photo.startsWith('http')
                ? teacher.photo 
                : `/api/teachers/photo/${teacher.id}`} 
              alt="" 
            />
          ) : (
            <div className="teachers-card-avatar-initials">
              {getInitials(teacher.first_name, teacher.last_name)}
            </div>
          )}
        </div>
        
        <span className={`teachers-card-status ${teacher.status === 'ACTIVE' ? 'is-active' : ''}`}>
          {teacher.status}
        </span>
      </div>

      {/* Name and Employee ID */}
      <div className="teachers-card-identity">
        <h4 className="teachers-card-name">
          {getFullName()}
        </h4>
        <span className="teachers-card-employee-id">
          ID: {teacher.employee_id}
        </span>
      </div>

      {/* Secondary Line: Dept & Designation */}
      <div className="teachers-card-department">
        {teacher.designation || 'Teacher'} • {teacher.department || 'Unassigned'}
      </div>

      {/* Subtle Separator */}
      <div className="teachers-card-divider" />

      {/* Contact Details */}
      <div className="teachers-card-contacts">
        {teacher.email && (
          <div className="teachers-card-contact-row">
            <Mail size={12} />
            <span>{teacher.email}</span>
          </div>
        )}
        {teacher.phone && (
          <div className="teachers-card-contact-row">
            <Phone size={12} />
            <span>{teacher.phone}</span>
          </div>
        )}
      </div>

      {/* Subtle Separator */}
      <div className="teachers-card-divider" />

      {/* Metrics Row */}
      <div className="teachers-card-metrics">
        <div className="teachers-card-metric-col">
          <span className="teachers-card-metric-value">
            {teacher.experience || '-'}
          </span>
          <span className="teachers-card-metric-label">
            Experience
          </span>
        </div>
        <div className="teachers-card-metric-col align-right">
          <span className="teachers-card-metric-value">
            {teacher.joining_date ? new Date(teacher.joining_date).getFullYear() : '-'}
          </span>
          <span className="teachers-card-metric-label">
            Joined
          </span>
        </div>
      </div>

      {/* Subtle Separator */}
      <div className="teachers-card-divider" />

      {/* Footer Action Buttons */}
      <div className="teachers-card-footer" onClick={(e) => e.stopPropagation()}>
        <Link to={`/teachers/${teacher.id}`} className="teachers-card-view-link">
          View Profile
        </Link>
        
        <div className="student-menu-container">
          <button 
            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === teacher.id ? null : teacher.id); }} 
            className="teachers-card-more-btn"
            title="More Actions"
          >
            ⋮
          </button>
          {activeMenuId === teacher.id && (
            <div className="dropdown-menu teachers-dropdown-menu">
              <button 
                onClick={(e) => { e.stopPropagation(); handleEditClick(teacher); }} 
                className="dropdown-item teachers-dropdown-item" 
              >
                <Edit2 size={14} /> Edit Profile
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteTeacher(teacher.id, getFullName()); }} 
                className="dropdown-item teachers-dropdown-item text-danger"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
