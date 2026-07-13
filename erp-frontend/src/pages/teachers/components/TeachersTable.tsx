import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Edit3, Trash2 } from 'lucide-react';

interface TeachersTableProps {
  teachers: any[];
  handleEditClick: (teacher: any) => void;
  handleDeleteTeacher: (id: string, name: string) => void;
}

export const TeachersTable: React.FC<TeachersTableProps> = ({
  teachers,
  handleEditClick,
  handleDeleteTeacher,
}) => {
  const getFullName = (t: any) => {
    return `${t.first_name} ${t.middle_name ? t.middle_name + ' ' : ''}${t.last_name}`;
  };

  return (
    <div className="card teachers-table-card">
      <table className="table">
        <thead>
          <tr>
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
            <tr key={t.id}>
              <td><strong>{t.employee_id}</strong></td>
              <td>
                <div className="students-row-66">
                  <div className="students-table-avatar-circle">
                    {t.photo ? (
                      <img 
                        src={t.photo.startsWith('data:image') || t.photo.startsWith('/api') || t.photo.startsWith('http')
                          ? t.photo 
                          : `/api/teachers/photo/${t.id}`} 
                        alt="" 
                        className="students-table-avatar-circle-img" 
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
