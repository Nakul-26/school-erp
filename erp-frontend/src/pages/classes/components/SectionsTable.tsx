import React from 'react';
import { RefreshCw, Info, Eye, Edit2, Archive, Trash2, MapPin, Users } from 'lucide-react';

interface SectionsTableProps {
  loading: boolean;
  filteredClasses: any[];
  institutionType: string;
  getProgramLabel: () => string;
  selectedSectionIds: string[];
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  canManageAcademic: boolean;
  onOpenDetails: (section: any) => void;
  onNavigateToWorkspace: (id: string) => void;
  onOpenEdit: (section: any) => void;
  onToggleStatus: (section: any) => void;
  onDelete: (id: string) => void;
}

export function SectionsTable({
  loading, filteredClasses, institutionType, getProgramLabel, selectedSectionIds,
  onSelectAll, onSelectOne, canManageAcademic, onOpenDetails, onNavigateToWorkspace,
  onOpenEdit, onToggleStatus, onDelete,
}: SectionsTableProps) {
  return (
    <div className="card classes-section-table-card">
      {loading ? (
        <div className="classes-col-34">
          <RefreshCw className="spinner classes-spinner" size={32} />
          <span className="classes-span-36">Loading sections database...</span>
        </div>
      ) : (
        <div className="classes-div-37">
          <table className="table classes-table">
            <thead>
              <tr className="classes-tr-39">
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={filteredClasses.length > 0 && selectedSectionIds.length === filteredClasses.length}
                    onChange={onSelectAll}
                    title="Select All"
                  />
                </th>
                <th className="classes-th-40">Section details</th>
                {institutionType !== 'school' && <th className="classes-th-41">Year Level</th>}
                <th className="classes-th-42">{getProgramLabel()}</th>
                <th className="classes-th-43">Classroom / Room</th>
                <th className="classes-th-44">Capacity Status</th>
                <th className="classes-th-45">Class Teacher</th>
                <th className="classes-th-46">Status</th>
                <th className="classes-th-47">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map(cls => {
                const isOverfilled = (cls.student_count || 0) >= (cls.capacity || 40);
                const percent = Math.min(100, Math.round(((cls.student_count || 0) / (cls.capacity || 40)) * 100));
                const isSelected = selectedSectionIds.includes(cls.id);

                return (
                  <tr key={cls.id} className={`hover-row classes-hover-row ${isSelected ? 'is-selected' : ''}`}>
                    <td style={{ width: '40px' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => onSelectOne(cls.id, e.target.checked)}
                      />
                    </td>
                    <td className="classes-td-49">
                      <span onClick={() => onNavigateToWorkspace(cls.id)} className="classes-span-50">
                        {cls.name}
                      </span>
                      <span className="classes-span-51">{cls.academic_year_name || 'No Year'}</span>
                    </td>
                    {institutionType !== 'school' && (
                      <td className="classes-td-52">Year {cls.year_number}</td>
                    )}
                    <td className="classes-td-53">
                      {cls.course_name || 'Unknown'}
                    </td>
                    <td className="classes-td-54">
                      {cls.room ? (
                        <span className="classes-row-55">
                          <MapPin size={14} className="classes-MapPin-56" /> {cls.room}
                        </span>
                      ) : (
                        <span className="classes-span-57">Not Assigned</span>
                      )}
                    </td>
                    <td className="classes-td-58">
                      <div className="classes-col-59">
                        <div className="classes-row-60">
                          <span style={{ color: isOverfilled ? '#dc2626' : 'var(--text-main)' }}>{cls.student_count || 0} / {cls.capacity || 40}</span>
                          <span className="classes-span-61">{percent}%</span>
                        </div>
                        <div className="classes-div-62">
                          <div style={{
                            width: `${percent}%`,
                            height: '100%',
                            borderRadius: '3px',
                            backgroundColor: percent > 100 ? '#ef4444' : percent >= 85 ? '#f97316' : '#10b981'
                          }} />
                        </div>
                      </div>
                    </td>
                    <td className="classes-td-63">
                      {cls.class_teacher_name ? (
                        <span className="classes-span-64">{cls.class_teacher_name}</span>
                      ) : (
                        <span className="classes-span-65">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="classes-td-66">
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: cls.is_active ? '#dcfce7' : '#fef3c7',
                        color: cls.is_active ? '#15803d' : '#b45309'
                      }}>
                        {cls.is_active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="classes-td-67">
                      <div className="classes-row-68">
                        <button className="btn btn-sm btn-outline classes-btn" onClick={() => onOpenDetails(cls)} title="View Section Overview">
                          <Info size={12} /> Overview
                        </button>
                        <button className="btn btn-sm btn-secondary classes-btn" onClick={() => onNavigateToWorkspace(cls.id)} title="Open Section Workspace">
                          <Eye size={14} />
                        </button>
                        {canManageAcademic && (
                          <button className="btn btn-sm btn-secondary classes-btn" onClick={() => onOpenEdit(cls)} title="Edit details">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canManageAcademic && (
                          <button className="btn btn-sm btn-secondary classes-btn" onClick={() => onToggleStatus(cls)} title={cls.is_active ? 'Archive section' : 'Restore section'}>
                            <Archive size={14} />
                          </button>
                        )}
                        {canManageAcademic && !cls.is_active && (
                          <button className="btn btn-sm btn-danger classes-btn" onClick={() => onDelete(cls.id)} title="Delete permanently">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredClasses.length === 0 && (
                <tr>
                  <td colSpan={institutionType === 'school' ? 7 : 8} className="classes-td-74">
                    <div className="classes-col-75">
                      <Users size={32} className="classes-Users-76" />
                      <span className="classes-span-77">No Classes or Sections Found</span>
                      <span className="classes-span-78">Try clearing filters or search to broaden search boundaries.</span>
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
