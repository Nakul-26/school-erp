import React from 'react';
import { getAuthenticatedUrl } from '../../../services/api';
import { Link } from 'react-router-dom';
import { Eye, Edit3, Trash2, Check, Archive } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import type { DataTableColumn } from '../../../components/DataTable';

interface TeachersTableProps {
  teachers: any[];
  selectedTeacherIds: string[];
  handleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectOne: (id: string, checked: boolean) => void;
  handleEditClick: (teacher: any) => void;
  handleDeleteTeacher: (id: string, name: string) => void;
  handleDeactivateTeacher: (id: string, name: string) => void;
  handleReactivateTeacher: (id: string, name: string) => void;
  canEditTeacher: boolean;
  canDeleteTeacher: boolean;
}

const getFullName = (t: any) => `${t.first_name} ${t.middle_name ? t.middle_name + ' ' : ''}${t.last_name}`;

export const TeachersTable: React.FC<TeachersTableProps> = ({
  teachers,
  selectedTeacherIds,
  handleSelectAll,
  handleSelectOne,
  handleEditClick,
  handleDeleteTeacher,
  handleDeactivateTeacher,
  handleReactivateTeacher,
  canEditTeacher,
  canDeleteTeacher,
}) => {
  const columns: DataTableColumn<any>[] = [
    { key: 'employee_id', header: 'Emp. ID', render: (t) => <strong>{t.employee_id}</strong> },
    {
      key: 'name',
      header: 'Name',
      render: (t) => (
        <div className="teachers-table-name-cell">
          <div className="teachers-table-avatar-circle">
            {t.photo ? (
              <img
                src={getAuthenticatedUrl(
                  t.photo.startsWith('data:image') || t.photo.startsWith('/api') || t.photo.startsWith('http')
                    ? t.photo
                    : `/api/teachers/photo/${t.id}`
                )}
                alt=""
                className="teachers-table-avatar-circle-img"
              />
            ) : (
              '👤'
            )}
          </div>
          <span>{getFullName(t)}</span>
        </div>
      ),
    },
    { key: 'department', header: 'Department', render: (t) => t.department || '-' },
    { key: 'designation', header: 'Designation', render: (t) => t.designation || '-' },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <span className={`badge badge-${t.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
          {t.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <div className="teachers-row-61">
          <Link to={`/teachers/${t.id}`} className="btn btn-sm btn-outline teachers-btn">
            <Eye size={12} /> View
          </Link>
          {canEditTeacher && (
            <button onClick={() => handleEditClick(t)} className="btn btn-sm btn-secondary teachers-btn">
              <Edit3 size={12} /> Edit
            </button>
          )}
          {canEditTeacher && (t.status === 'INACTIVE' ? (
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
          ))}
          {canDeleteTeacher && (
            <button onClick={() => handleDeleteTeacher(t.id, getFullName(t))} className="btn btn-sm btn-danger teachers-btn" title="Delete Permanent">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={teachers}
      rowKey={(t) => t.id}
      className="teachers-table-card"
      selection={{
        selectedIds: selectedTeacherIds,
        onSelectAll: (checked) => handleSelectAll({ target: { checked } } as React.ChangeEvent<HTMLInputElement>),
        onSelectOne: handleSelectOne,
      }}
    />
  );
};
