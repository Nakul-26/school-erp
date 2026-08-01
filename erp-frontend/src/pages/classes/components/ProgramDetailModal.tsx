import React from 'react';

type ProgramDetailTab = 'info' | 'syllabus' | 'sections' | 'timeline';

interface ProgramDetailModalProps {
  show: boolean;
  selectedProgram: any;
  detailTab: ProgramDetailTab;
  setDetailTab: (tab: ProgramDetailTab) => void;
  detailSubjects: any[];
  detailSections: any[];
  groupedSubjects: { [key: string]: any[] };
  getDeptCode: (deptId: string) => string;
  getTeacherName: (teacherId: string) => string;
  onClose: () => void;
}

export function ProgramDetailModal({
  show, selectedProgram, detailTab, setDetailTab, detailSubjects, detailSections, groupedSubjects, getDeptCode, getTeacherName, onClose,
}: ProgramDetailModalProps) {
  if (!show || !selectedProgram) return null;

  return (
    <div className="modal classes-modal">
      <div className="modal-content classes-modal-content size-lg">

        {/* Modal Hero Header */}
        <div className="classes-row-259">
          <div className="classes-row-260">
            🎓
          </div>
          <div>
            <h3 className="classes-title-261">{selectedProgram.name}</h3>
            <span className="classes-span-262">
              Code: <code className="classes-code-263">{selectedProgram.course_code}</code>
            </span>
          </div>
          <span className={`badge badge-${selectedProgram.is_active === 1 ? 'success' : 'secondary'} classes-span-264`}>
            {selectedProgram.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
          </span>
        </div>

        {/* Tabs Header */}
        <div className="classes-row-265">
          {[
            { tab: 'info', label: 'Info Details' },
            { tab: 'syllabus', label: `Syllabus / Subjects (${detailSubjects.length})` },
            { tab: 'sections', label: `Class Sections (${detailSections.length})` },
            { tab: 'timeline', label: 'Timeline' }
          ].map(t => (
            <button
              key={t.tab}
              type="button"
              onClick={() => setDetailTab(t.tab as ProgramDetailTab)}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: 'none',
                borderBottom: detailTab === t.tab ? '2px solid var(--primary)' : '2px solid transparent',
                color: detailTab === t.tab ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: detailTab === t.tab ? 700 : 500,
                cursor: 'pointer',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                height: '100%'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Info */}
        {detailTab === 'info' && (
          <div className="classes-col-266">
            <div className="classes-div-267">
              <span className="classes-span-268">Description</span>
              <p className="classes-text-269">{selectedProgram.description || 'No syllabus description provided.'}</p>
            </div>

            <div className="classes-grid-270">
              <div className="classes-div-271">
                <span className="classes-span-272">Curriculum Options</span>
                <div className="classes-col-273">
                  <div className="classes-row-274">
                    <span>Semesters Enforced:</span>
                    <strong style={{ color: selectedProgram.semester_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {selectedProgram.semester_enabled === 1 ? 'Yes' : 'No'}
                    </strong>
                  </div>
                  <div className="classes-row-275">
                    <span>Credits System:</span>
                    <strong style={{ color: selectedProgram.credit_system_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {selectedProgram.credit_system_enabled === 1 ? 'Yes' : 'No'}
                    </strong>
                  </div>
                  <div className="classes-row-276">
                    <span>Allows Electives:</span>
                    <strong style={{ color: selectedProgram.electives_enabled === 1 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {selectedProgram.electives_enabled === 1 ? 'Yes' : 'No'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="classes-col-277">
                <div className="classes-div-278">
                  <span className="classes-span-279">Department Mapped</span>
                  <span className="classes-span-280">{getDeptCode(selectedProgram.department_id)}</span>
                </div>
                <div className="classes-div-281">
                  <span className="classes-span-282">Duration Cycle</span>
                  <span className="classes-span-283">{selectedProgram.duration_years} {selectedProgram.duration_years === 1 ? 'Year' : 'Years'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Syllabus / Subjects grouped */}
        {detailTab === 'syllabus' && (
          <div className="classes-col-284">
            {Object.keys(groupedSubjects).map(term => (
              <div key={term} className="classes-div-285">
                <h4 className="classes-title-286">
                  {term}
                </h4>
                <table className="classes-table-287">
                  <thead>
                    <tr className="classes-tr-288">
                      <th className="classes-th-289">Code</th>
                      <th className="classes-th-290">Subject Name</th>
                      <th className="classes-th-291">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedSubjects[term]?.map((sub: any) => (
                      <tr key={sub.id} className="classes-tr-292">
                        <td className="classes-td-293"><code>{sub.subject_code}</code></td>
                        <td className="classes-td-294">{sub.subject_name}</td>
                        <td className="classes-td-295">{sub.credits || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {detailSubjects.length === 0 && (
              <div className="classes-div-296">
                No subjects mapped to this curriculum layout.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Class Sections */}
        {detailTab === 'sections' && (
          <div className="classes-div-297">
            <table className="table classes-table">
              <thead>
                <tr>
                  <th className="classes-th-299">Section</th>
                  <th className="classes-th-300">Year / Sem Index</th>
                  <th className="classes-th-301">Class Teacher</th>
                  <th className="classes-th-302">Room</th>
                </tr>
              </thead>
              <tbody>
                {detailSections.map(sec => (
                  <tr key={sec.id} className="classes-tr-303">
                    <td className="classes-td-304">{sec.name}</td>
                    <td className="classes-td-305">Year {sec.year_number}</td>
                    <td className="classes-td-306">{getTeacherName(sec.class_teacher_id)}</td>
                    <td className="classes-td-307">{sec.room || '-'}</td>
                  </tr>
                ))}
                {detailSections.length === 0 && (
                  <tr>
                    <td colSpan={4} className="classes-td-308">
                      No active sections provisioned for this program.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Timeline */}
        {detailTab === 'timeline' && (
          <div className="classes-div-309">
            <div className="classes-col-310">
              <div className="classes-div-311">
                <div className="classes-div-312" />
                <span className="classes-span-313">
                  {selectedProgram.created_at ? new Date(selectedProgram.created_at).toLocaleDateString() : 'N/A'}
                </span>
                <strong className="classes-strong-314">Curriculum Registered</strong>
                <span className="classes-span-315">Record initialized in system database.</span>
              </div>

              <div className="classes-div-316">
                <div className="classes-div-317" />
                <span className="classes-span-318">Current Status</span>
                <strong className="classes-strong-319">
                  Status set to {selectedProgram.is_active === 1 ? 'ACTIVE' : 'ARCHIVED'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Close Actions */}
        <div className="modal-actions classes-modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">Close Details</button>
        </div>
      </div>
    </div>
  );
}
