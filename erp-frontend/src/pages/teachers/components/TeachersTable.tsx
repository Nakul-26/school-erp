import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Edit3, Trash2, Check, Archive } from 'lucide-react';

interface TeachersTableProps {
  teachers: any[];
  selectedTeacherIds: string[];
  handleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectOne: (id: string, checked: boolean) => void;
  handleEditClick: (teacher: any) => void;
  handleDeleteTeacher: (id: string, name: string) => void;
  handleDeactivateTeacher: (id: string, name: string) => void;
  handleReactivateTeacher: (id: string, name: string) => void;
}

export const TeachersTable: React.FC<TeachersTableProps> = ({
  teachers,
  selectedTeacherIds,
  handleSelectAll,
  handleSelectOne,
  handleEditClick,
  handleDeleteTeacher,
  handleDeactivateTeacher,
  handleReactivateTeacher,
}) => {
  const allSelected = selectedTeacherIds.length === teachers.length && teachers.length > 0;

  const getFullName = (t: any) => {
    return `${t.first_name} ${t.middle_name ? t.middle_name + ' ' : ''}${t.last_name}`;
  };

  return (
    <div className="card teachers-table-card">
      <table className="table">
        <thead>
          <tr>
            <th className="teachers-th-checkbox">
              <input 
                type="checkbox" 
                checked={allSelected} 
                onChange={handleSelectAll} 
                aria-label="Select all teachers"
              />
            </th>
            <th>Emp. ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map(t => (
            <tr key={t.id} className={selectedTeacherIds.includes(t.id) ? 'is-selected' : ''}>
              <td>
                <input 
                  type="checkbox" 
                  checked={selectedTeacherIds.includes(t.id)} 
                  onChange={e => handleSelectOne(t.id, e.target.checked)} 
                  aria-label={`Select teacher ${getFullName(t)}`}
                />
              </td>
              <td><strong>{t.employee_id}</strong></td>
              <td>
                <div className="teachers-table-name-cell">
                  <div className="teachers-table-avatar-circle">
                    {t.photo ? (
                      <img 
                        src={t.photo.startsWith('data:image') || t.photo.startsWith('/api') || t.photo.startsWith('http')
                          ? t.photo 
                          : `/api/teachers/photo/${t.id}`} 
                        alt="" 
                        className="teachers-table-avatar-circle-img" 
                      />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <span>{getFullName(t)}</span>
                </div>
              </td>
              <td>{t.department || '-'}</td>
              <td>{t.designation || '-'}</td>
              <td>
                <span className={`badge badge-${t.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                  {t.status}
                </span>
              </td>
              <td>
                <div className="teachers-row-61">
                  <Link to={`/teachers/${t.id}`} className="btn btn-sm btn-outline teachers-btn">
                    <Eye size={12} /> View
                  </Link>
                  <button onClick={() => handleEditClick(t)} className="btn btn-sm btn-secondary teachers-btn">
                    <Edit3 size={12} /> Edit
                  </button>
                  {t.status === 'INACTIVE' ? (
                    <button 
                      onClick={() => handleReactivateTeacher(t.id, getFullName(t))} 
                      className="btn btn-sm btn-outline teachers-btn text-success" 
                      title="Reactivate Teacher"
                    >
                      <Check size={12} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleDeactivateTeacher(t.id, getFullName(t))} 
                      className="btn btn-sm btn-outline teachers-btn text-warning" 
                      title="Deactivate Teacher"
                    >
                      <Archive size={12} />
                    </button>
                  )}
                  <button onClick={() => handleDeleteTeacher(t.id, getFullName(t))} className="btn btn-sm btn-danger teachers-btn" title="Delete Permanent">
                    <Trash2 size={12} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
