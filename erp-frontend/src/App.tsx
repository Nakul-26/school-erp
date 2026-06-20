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
          
          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
