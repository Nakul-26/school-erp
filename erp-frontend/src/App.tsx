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
import Programs from './pages/Programs';
import Classes from './pages/Classes';
import Subjects from './pages/Subjects';
import AcademicCalendar from './pages/AcademicCalendar';
import TimetableSlots from './pages/TimetableSlots';
import WeeklyTimetable from './pages/WeeklyTimetable';
import Attendance from './pages/Attendance';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import Teachers from './pages/Teachers';
import TeacherDetails from './pages/TeacherDetails';
import Exams from './pages/Exams';
import TeacherAttendance from './pages/TeacherAttendance';
import AttendanceReports from './pages/AttendanceReports';
import TeacherReports from './pages/TeacherReports';
import Announcements from './pages/Announcements';
import Notifications from './pages/Notifications';
import FeeStructures from './pages/FeeStructures';
import StudentFees from './pages/StudentFees';
import FeeReports from './pages/FeeReports';
import Profile from './pages/Profile';
import DataExport from './pages/DataExport';
import BulkImport from './pages/BulkImport';
import SystemSettings from './pages/SystemSettings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Foundation Phase 1 Modules */}
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}>
              <ManageUsers />
            </ProtectedRoute>
          } />
          
          <Route path="/institution-setup" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}>
              <InstitutionSetup />
            </ProtectedRoute>
          } />
          
          <Route path="/audit-logs" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}>
              <AuditLogs />
            </ProtectedRoute>
          } />

          {/* Foundation Phase 2 Modules */}
          <Route path="/academic-years" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}>
              <AcademicYears />
            </ProtectedRoute>
          } />
          
          <Route path="/departments" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}>
              <Departments />
            </ProtectedRoute>
          } />
          
          <Route path="/programs" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}>
              <Programs />
            </ProtectedRoute>
          } />
          
          <Route path="/classes" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}>
              <Classes />
            </ProtectedRoute>
          } />
          
          <Route path="/subjects" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}>
              <Subjects />
            </ProtectedRoute>
          } />
          
          <Route path="/calendar" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}>
              <AcademicCalendar />
            </ProtectedRoute>
          } />
          
          <Route path="/timetable-slots" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}>
              <TimetableSlots />
            </ProtectedRoute>
          } />
          
          <Route path="/timetable" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}>
              <WeeklyTimetable />
            </ProtectedRoute>
          } />
          
          <Route path="/attendance" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}>
              <Attendance />
            </ProtectedRoute>
          } />
          
          <Route path="/students" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}>
              <Students />
            </ProtectedRoute>
          } />
          
          <Route path="/students/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}>
              <StudentDetails />
            </ProtectedRoute>
          } />
          
          <Route path="/teachers" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}>
              <Teachers />
            </ProtectedRoute>
          } />
          
          <Route path="/teachers/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}>
              <TeacherDetails />
            </ProtectedRoute>
          } />
          
          <Route path="/exams" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}>
              <Exams />
            </ProtectedRoute>
          } />
          
          <Route path="/teacher-attendance" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}>
              <TeacherAttendance />
            </ProtectedRoute>
          } />
          
          <Route path="/attendance-reports" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}>
              <AttendanceReports />
            </ProtectedRoute>
          } />
          
          <Route path="/teacher-reports" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}>
              <TeacherReports />
            </ProtectedRoute>
          } />
          
          <Route path="/announcements" element={
            <ProtectedRoute>
              <Announcements />
            </ProtectedRoute>
          } />
          
          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />

          <Route path="/fee-structures" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Accountant']}>
              <FeeStructures />
            </ProtectedRoute>
          } />
          
          <Route path="/student-fees" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Accountant', 'Teacher']}>
              <StudentFees />
            </ProtectedRoute>
          } />
          
          <Route path="/fee-reports" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'Accountant']}>
              <FeeReports />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/exports" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}>
              <DataExport />
            </ProtectedRoute>
          } />

          <Route path="/imports" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}>
              <BulkImport />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}>
              <SystemSettings />
            </ProtectedRoute>
          } />
          
          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
