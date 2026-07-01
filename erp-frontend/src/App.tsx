import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import InstitutionSetup from './pages/InstitutionSetup';
import AuditLogs from './pages/AuditLogs';
import AcademicYears from './pages/AcademicYears';
import Departments from './pages/Departments';
import Classes from './pages/Classes';
import SectionWorkspace from './pages/SectionWorkspace';
import Subjects from './pages/Subjects';
import SubjectWorkspace from './pages/SubjectWorkspace';
import AcademicCalendar from './pages/AcademicCalendar';
import Attendance from './pages/Attendance';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import Teachers from './pages/Teachers';
import TeacherDetails from './pages/TeacherDetails';
import Exams from './pages/Exams';
import TeacherAttendance from './pages/TeacherAttendance';
import Announcements from './pages/Announcements';
import Notifications from './pages/Notifications';
import FeeStructures from './pages/FeeStructures';
import StudentFees from './pages/StudentFees';
import Profile from './pages/Profile';
import SystemSettings from './pages/SystemSettings';
import ApprovalsInbox from './pages/ApprovalsInbox';
import LeaveTypes from './pages/LeaveTypes';
import MyLeaveApplications from './pages/MyLeaveApplications';
import LeaveApprovals from './pages/LeaveApprovals';
import GradeSettings from './pages/GradeSettings';
import SalaryStructures from './pages/SalaryStructures';
import PayrollRuns from './pages/PayrollRuns';
import PayrollRunDetail from './pages/PayrollRunDetail';
import StudentLeaveApprovals from './pages/StudentLeaveApprovals';
import HomeworkList from './pages/HomeworkList';

// ── V2 Merged Pages ──────────────────────────────────────────────────────────
import Admissions from './pages/Admissions';
import DataTools from './pages/DataTools';
import Reports from './pages/Reports';
import Library from './pages/Library';
import Transport from './pages/Transport';
import Certificates from './pages/Certificates';
import Messaging from './pages/Messaging';
import TimetablePage from './pages/TimetablePage';
import SchoolSetup from './pages/SchoolSetup';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* ── People ──────────────────────────────────────────────────── */}
          <Route path="/students" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><Students /></ProtectedRoute>} />
          <Route path="/students/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><StudentDetails /></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Teachers /></ProtectedRoute>} />
          <Route path="/teachers/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><TeacherDetails /></ProtectedRoute>} />

          {/* ── Admissions (V2 merged) ───────────────────────────────────── */}
          <Route path="/admissions" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Admissions /></ProtectedRoute>} />
          {/* Legacy redirects */}
          <Route path="/admissions/inquiries" element={<Navigate to="/admissions" replace />} />
          <Route path="/admissions/applications" element={<Navigate to="/admissions?tab=applications" replace />} />

          {/* ── Academics ───────────────────────────────────────────────── */}
          <Route path="/academic-years" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><AcademicYears /></ProtectedRoute>} />
          <Route path="/departments" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Departments /></ProtectedRoute>} />
          <Route path="/programs" element={<Navigate to="/classes?tab=courses" replace />} />
          <Route path="/classes" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Classes /></ProtectedRoute>} />
          <Route path="/classes/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><SectionWorkspace /></ProtectedRoute>} />
          <Route path="/subjects" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Subjects /></ProtectedRoute>} />
          <Route path="/subjects/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><SubjectWorkspace /></ProtectedRoute>} />
          <Route path="/allocations" element={<Navigate to="/subjects?tab=assignments" replace />} />
          <Route path="/approvals" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><ApprovalsInbox /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><AcademicCalendar /></ProtectedRoute>} />
          
          {/* ── Timetable (V2 merged) ────────────────────────────────────── */}
          <Route path="/timetable" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><TimetablePage /></ProtectedRoute>} />
          {/* Legacy redirect for timetable-slots */}
          <Route path="/timetable-slots" element={<Navigate to="/timetable?tab=periods" replace />} />

          {/* ── Attendance ──────────────────────────────────────────────── */}
          <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><Attendance /></ProtectedRoute>} />
          <Route path="/teacher-attendance" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><TeacherAttendance /></ProtectedRoute>} />

          {/* ── Exams & Homework ─────────────────────────────────────────── */}
          <Route path="/exams" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><Exams /></ProtectedRoute>} />
          <Route path="/homework" element={<ProtectedRoute><HomeworkList /></ProtectedRoute>} />

          {/* ── Communication ────────────────────────────────────────────── */}
          <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
          <Route path="/transport" element={<ProtectedRoute><Transport /></ProtectedRoute>} />
          <Route path="/certificates" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><Certificates /></ProtectedRoute>} />
          <Route path="/messaging" element={<ProtectedRoute><Messaging /></ProtectedRoute>} />

          {/* ── Finance ─────────────────────────────────────────────────── */}
          <Route path="/fee-structures" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Accountant']}><FeeStructures /></ProtectedRoute>} />
          <Route path="/student-fees" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Accountant', 'Teacher']}><StudentFees /></ProtectedRoute>} />
          <Route path="/fee-reports" element={<Navigate to="/reports?tab=fees" replace />} />
          <Route path="/payroll/salary-structures" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><SalaryStructures /></ProtectedRoute>} />
          <Route path="/payroll/runs" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><PayrollRuns /></ProtectedRoute>} />
          <Route path="/payroll/runs/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><PayrollRunDetail /></ProtectedRoute>} />

          {/* ── Leave Management ─────────────────────────────────────────── */}
          <Route path="/leave/types" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><LeaveTypes /></ProtectedRoute>} />
          <Route path="/leave/my" element={<ProtectedRoute><MyLeaveApplications /></ProtectedRoute>} />
          <Route path="/leave/approvals" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><LeaveApprovals /></ProtectedRoute>} />
          <Route path="/student-leaves/approvals" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher']}><StudentLeaveApprovals /></ProtectedRoute>} />

          {/* ── Reports (V2 merged) ──────────────────────────────────────── */}
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><Reports /></ProtectedRoute>} />
          {/* Legacy redirects */}
          <Route path="/attendance-reports" element={<Navigate to="/reports" replace />} />
          <Route path="/teacher-reports" element={<Navigate to="/reports?tab=teacher" replace />} />

          {/* ── Profile ──────────────────────────────────────────────────── */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* ── Settings & Setup ─────────────────────────────────────────── */}
          <Route path="/users" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><ManageUsers /></ProtectedRoute>} />
          <Route path="/institution-setup" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><InstitutionSetup /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><SystemSettings /></ProtectedRoute>} />
          <Route path="/settings/grades" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><GradeSettings /></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><AuditLogs /></ProtectedRoute>} />
          <Route path="/setup" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><SchoolSetup /></ProtectedRoute>} />

          {/* ── Data Tools (V2 merged) ───────────────────────────────────── */}
          <Route path="/data-tools" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><DataTools /></ProtectedRoute>} />
          {/* Legacy redirects */}
          <Route path="/exports" element={<Navigate to="/data-tools" replace />} />
          <Route path="/imports" element={<Navigate to="/data-tools?tab=import" replace />} />
          
          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
