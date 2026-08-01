import React from 'react';

interface AttendanceTabProps {
  attendanceInfo: any;
}

export function AttendanceTab({ attendanceInfo }: AttendanceTabProps) {
  return (
    <div>
      <h3 className="student-details-title-83">Attendance Performance</h3>

      {attendanceInfo && attendanceInfo.total > 0 ? (
        <div>
          {/* KPI Summary Block */}
          <div className="student-details-grid-84">
            <div className="student-details-div-85">
              <span className="student-details-span-86">Attendance Rate</span>
              <strong className={`student-details-attendance-pct ${attendanceInfo.percentage >= 75 ? 'is-good' : 'is-warning'}`}>
                {attendanceInfo.percentage}%
              </strong>
            </div>
            <div className="student-details-div-87">
              <span className="student-details-span-88">Classes Attended</span>
              <strong className="student-details-strong-89">
                {attendanceInfo.present}
              </strong>
            </div>
            <div className="student-details-div-90">
              <span className="student-details-span-91">Total Sessions</span>
              <strong className="student-details-strong-92">
                {attendanceInfo.total}
              </strong>
            </div>
          </div>

          {/* Detailed Logs Table */}
          <h4 className="student-details-title-93">Detailed Session Records</h4>
          <div className="student-details-div-94">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Instructor</th>
                  <th>Attendance Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendanceInfo.records?.map((record: any, index: number) => (
                  <tr key={index}>
                    <td><strong>{record.date}</strong></td>
                    <td>{record.subject_name}</td>
                    <td>{record.teacher_name}</td>
                    <td>
                      <span className={`badge badge-${record.status === 'present' || record.status === 'late' ? 'success' : 'danger'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>{record.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          {/* Clean Attendance KPI fallback when 0 sessions logged */}
          <div className="student-details-grid-95">
            <div className="student-details-div-96">
              <span className="student-details-span-97">Attendance Rate</span>
              <strong className="student-details-strong-98">--</strong>
            </div>
            <div className="student-details-div-99">
              <span className="student-details-span-100">Classes Attended</span>
              <strong className="student-details-strong-101">0</strong>
            </div>
            <div className="student-details-div-102">
              <span className="student-details-span-103">Total Sessions</span>
              <strong className="student-details-strong-104">0</strong>
            </div>
          </div>
          <div className="student-details-div-105">
            <p className="student-details-text-106">No attendance data available yet.</p>
          </div>
        </div>
      )}
    </div>
  );
}
