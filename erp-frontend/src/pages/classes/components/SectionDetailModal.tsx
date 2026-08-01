import React from 'react';
import { RefreshCw, MapPin, Users, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

type SectionDetailTab = 'info' | 'roster' | 'timetable' | 'timeline';

interface SectionDetailModalProps {
  show: boolean;
  selectedSection: any;
  detailTab: SectionDetailTab;
  setDetailTab: (tab: SectionDetailTab) => void;
  loading: boolean;
  students: any[];
  timetable: any[];
  logs: any[];
  onClose: () => void;
}

export function SectionDetailModal({ show, selectedSection, detailTab, setDetailTab, loading, students, timetable, logs, onClose }: SectionDetailModalProps) {
  if (!show || !selectedSection) return null;

  return (
    <div className="modal-overlay classes-modal-overlay">
      <div className="modal-content classes-modal-content size-md">
        <div className="classes-row-150">
          <div>
            <h3 className="classes-title-151">Section Overview: {selectedSection.name}</h3>
            <span className="classes-span-152">
              {selectedSection.course_name} • {selectedSection.academic_year_name}
            </span>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>Close Overview</button>
        </div>

        {/* Tab Links */}
        <div className="classes-row-153">
          {[
            { tab: 'info', label: 'Info & Analytics' },
            { tab: 'roster', label: `Student Roster (${loading ? '...' : students.length})` },
            { tab: 'timetable', label: `Timetable (${loading ? '...' : timetable.length})` },
            { tab: 'timeline', label: 'Audit Timeline' }
          ].map(t => (
            <button
              key={t.tab}
              type="button"
              onClick={() => setDetailTab(t.tab as SectionDetailTab)}
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

        {loading ? (
          <div className="classes-col-154">
            <RefreshCw className="spinner classes-spinner" size={24} />
            <span className="classes-span-156">Retrieving overview logs...</span>
          </div>
        ) : (
          <div>
            {/* Tab 1: Info & Analytics */}
            {detailTab === 'info' && (
              <div className="classes-col-157">
                <div className="classes-grid-158">
                  <div className="classes-div-159">
                    <span className="classes-span-160">Classroom Location</span>
                    <span className="classes-row-161">
                      <MapPin size={16} /> {selectedSection.room || 'No Room Assigned'}
                    </span>
                  </div>

                  <div className="classes-div-162">
                    <span className="classes-span-163">Class Teacher</span>
                    <span className="classes-row-164">
                      <Users size={16} /> {selectedSection.class_teacher_name || 'No Teacher Mapped'}
                    </span>
                  </div>
                </div>

                <div className="classes-div-165">
                  <div className="classes-row-166">
                    <span className="classes-span-167">Section Enrollment Fill Rate</span>
                    <span className="classes-span-168">{selectedSection.student_count || 0} / {selectedSection.capacity || 40} Students</span>
                  </div>

                  {(() => {
                    const count = selectedSection.student_count || 0;
                    const cap = selectedSection.capacity || 40;
                    const percent = Math.min(100, Math.round((count / cap) * 100));
                    return (
                      <div>
                        <div className="classes-div-169">
                          <div style={{
                            width: `${percent}%`,
                            height: '100%',
                            borderRadius: '6px',
                            backgroundColor: percent > 100 ? '#ef4444' : percent >= 85 ? '#f97316' : '#10b981'
                          }} />
                        </div>
                        <span className="classes-row-170">
                          {percent >= 100 ? (
                            <><AlertTriangle size={14} className="classes-AlertTriangle-171" /> <span className="classes-span-172">Capacity limit reached! Additional enrollments blocked.</span></>
                          ) : percent >= 85 ? (
                            <><AlertTriangle size={14} className="classes-AlertTriangle-173" /> <span className="classes-span-174">Approaching max capacity limit.</span></>
                          ) : (
                            <><CheckCircle2 size={14} className="classes-CheckCircle2-175" /> <span>Safe capacity level. Enrolling new students is allowed.</span></>
                          )}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Tab 2: Student Roster */}
            {detailTab === 'roster' && (
              <div>
                <div className="classes-row-176">
                  <span className="classes-span-177">Enrolled Student Directory</span>
                  <span className="classes-span-178">
                    {students.length} Students
                  </span>
                </div>

                <div className="classes-div-179">
                  <table className="table classes-table">
                    <thead>
                      <tr className="classes-tr-181">
                        <th className="classes-th-182">Student ID</th>
                        <th className="classes-th-183">Name</th>
                        <th className="classes-th-184">Email</th>
                        <th className="classes-th-185">Semester</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.id} className="classes-tr-186">
                          <td className="classes-td-187"><code>{student.student_id || student.id.substring(0, 8)}</code></td>
                          <td className="classes-td-188">{student.first_name} {student.last_name}</td>
                          <td className="classes-td-189">{student.email || 'N/A'}</td>
                          <td className="classes-td-190">Semester {student.semester || '1'}</td>
                        </tr>
                      ))}
                      {students.length === 0 && (
                        <tr>
                          <td colSpan={4} className="classes-td-191">
                            No active students currently enrolled in this section.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Timetable */}
            {detailTab === 'timetable' && (
              <div>
                <h4 className="classes-title-192">Weekly Class Schedule</h4>
                <div className="classes-div-193">
                  <table className="table classes-table">
                    <thead>
                      <tr className="classes-tr-195">
                        <th className="classes-th-196">Day</th>
                        <th className="classes-th-197">Period Time</th>
                        <th className="classes-th-198">Subject</th>
                        <th className="classes-th-199">Teacher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timetable.map(item => (
                        <tr key={item.id} className="classes-tr-200">
                          <td className="classes-td-201">{item.day_of_week}</td>
                          <td className="classes-td-202">
                            <span className="classes-row-203">
                              <Clock size={12} /> {item.start_time} - {item.end_time}
                            </span>
                          </td>
                          <td className="classes-td-204">{item.subject_name}</td>
                          <td className="classes-td-205">{item.teacher_name}</td>
                        </tr>
                      ))}
                      {timetable.length === 0 && (
                        <tr>
                          <td colSpan={4} className="classes-td-206">
                            No timetable schedule entries assigned for this section.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Audit Timeline */}
            {detailTab === 'timeline' && (
              <div>
                <h4 className="classes-title-207">Activity History Log</h4>
                <div className="classes-col-208">
                  {logs.map((log: any) => (
                    <div key={log.id} className="classes-col-209">
                      <span className="classes-span-210">{log.description}</span>
                      <span className="classes-row-211">
                        <span>by {log.user_name} ({log.user_email})</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <span className="classes-span-212">
                      No audit activity logs recorded for this section.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
