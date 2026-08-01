import React from 'react';
import { GraduationCap } from 'lucide-react';

interface AcademicTabProps {
  student: any;
  enrollments: any[];
  academicYears: any[];
  programs: any[];
  sections: any[];
  institutionType: string;
  getProgramLabel: () => string;
  canEditStudent: boolean;
  allocation: any;
  onOpenTransfer: () => void;
  onOpenPromote: () => void;
  onOpenChangeSection: () => void;
  onOpenEnroll: () => void;
  onOpenTransport: () => void;
}

export function AcademicTab({
  student, enrollments, academicYears, programs, sections, institutionType, getProgramLabel,
  canEditStudent, allocation, onOpenTransfer, onOpenPromote, onOpenChangeSection, onOpenEnroll, onOpenTransport,
}: AcademicTabProps) {
  return (
    <div>
      <div className="student-details-row-46">
        <h3 className="student-details-title-47">Academic Enrollment Hub</h3>
      </div>

      {/* Current Enrollment Status Card */}
      {enrollments.length > 0 ? (
        <div className="student-details-grid-48">
          <div>
            <h4 className="student-details-row-49">
              <GraduationCap size={18} className="student-details-GraduationCap-50" /> Current Enrollment Status
            </h4>
            <div className="student-details-grid-51">
              <div>
                <span className="student-details-span-52">Academic Year</span>
                <strong className="student-details-strong-53">
                  {academicYears.find(y => y.id === enrollments[0].academic_year_id)?.name || 'N/A'}
                </strong>
              </div>
              <div>
                <span className="student-details-span-54">{getProgramLabel()}</span>
                <strong className="student-details-strong-55">
                  {programs.find(p => p.id === enrollments[0].course_id)?.name || 'N/A'}
                </strong>
              </div>
              <div>
                <span className="student-details-span-56">Section</span>
                <strong className="student-details-strong-57">
                  {sections.find(s => s.id === enrollments[0].section_id)?.name || 'N/A'}
                </strong>
              </div>
              {institutionType !== 'school' && (
                <div>
                  <span className="student-details-span-58">Semester</span>
                  <strong className="student-details-strong-59">
                    Semester {enrollments[0].semester || 1}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Actions group */}
          {canEditStudent && (
            <div className="student-details-col-60">
              <button className="btn btn-primary btn-sm student-details-btn" onClick={onOpenTransfer}>
                Transfer Student
              </button>
              <button className="btn btn-outline btn-sm student-details-btn" onClick={onOpenPromote}>
                Promote Student
              </button>
              <button className="btn btn-secondary btn-sm student-details-btn" onClick={onOpenChangeSection}>
                Change Section
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="student-details-div-64">
          <p className="student-details-text-65">This student is not enrolled in any academic year/class.</p>
          {canEditStudent && (
            <button className="btn btn-primary btn-sm" onClick={onOpenEnroll}>
              Enroll Student
            </button>
          )}
        </div>
      )}

      {/* History Table */}
      <div>
        <h4 className="student-details-title-66">
          Enrollment Logs & History
        </h4>
        <div className="student-details-div-67">
          <table className="table">
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>{getProgramLabel()}</th>
                <th>Section</th>
                {institutionType !== 'school' && <th>Semester</th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e, idx) => (
                <tr key={e.id}>
                  <td><strong>{academicYears.find(y => y.id === e.academic_year_id)?.name || 'Unknown'}</strong></td>
                  <td>{programs.find(p => p.id === e.course_id)?.name || 'Unknown'}</td>
                  <td>{sections.find(s => s.id === e.section_id)?.name || 'Unknown'}</td>
                  {institutionType !== 'school' && <td>Semester {e.semester || '1'}</td>}
                  <td>
                    {idx === 0 ? (
                      <span className="badge badge-success">Current</span>
                    ) : (
                      <span className="badge badge-secondary">Historic</span>
                    )}
                  </td>
                </tr>
              ))}
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="student-details-td-68">
                    No enrollment history has been recorded for this student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transport Route Section */}
      <div className="student-details-div-69">
        <div className="student-details-row-70">
          <div>
            <h4 className="student-details-title-71">
              🚌 Transport Route Assignment
            </h4>
            <p className="student-details-text-72">
              Manage bus routing and pick-up/drop-off settings for this student profile.
            </p>
          </div>
          {canEditStudent && (
            <button
              className="btn btn-outline btn-sm"
              onClick={onOpenTransport}
            >
              {allocation ? 'Change Bus Route' : 'Assign Bus Route'}
            </button>
          )}
        </div>

        {allocation ? (
          <div className="student-details-grid-73">
            <div>
              <span className="student-details-span-74">Assigned Route</span>
              <strong className="student-details-strong-75">{allocation.route_name || 'Route Details'}</strong>
            </div>
            <div>
              <span className="student-details-span-76">Vehicle Number</span>
              <strong className="student-details-strong-77">{allocation.vehicle_number || 'N/A'}</strong>
            </div>
            <div>
              <span className="student-details-span-78">Pickup / Drop point</span>
              <strong className="student-details-strong-79">{allocation.pickup_point || 'Not specified'}</strong>
            </div>
            <div>
              <span className="student-details-span-80">Monthly Fare</span>
              <strong className="student-details-strong-81">₹{allocation.monthly_charge || 0}</strong>
            </div>
          </div>
        ) : (
          <div className="student-details-div-82">
            This student is not currently assigned to any transport route.
          </div>
        )}
      </div>
    </div>
  );
}
