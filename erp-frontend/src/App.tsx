import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import StudentDetails from './pages/StudentDetails'
import Teachers from './pages/Teachers'
import TeacherDetails from './pages/TeacherDetails'
import ManageUsers from './pages/ManageUsers'
import Attendance from './pages/Attendance'
import Timetable from './pages/Timetable'
import Fees from './pages/Fees'
import Exams from './pages/Exams'
import Notifications from './pages/Notifications'
import AcademicYears from './pages/AcademicYears'
import Programs from './pages/Programs'
import Sections from './pages/Sections'
import Subjects from './pages/Subjects'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Foundation Modules */}
          <Route path="/academic-years" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AcademicYears /></ProtectedRoute>} />
          <Route path="/programs" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><Programs /></ProtectedRoute>} />
          <Route path="/sections" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><Sections /></ProtectedRoute>} />
          <Route path="/subjects" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><Subjects /></ProtectedRoute>} />
          
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/students/:id" element={<ProtectedRoute><StudentDetails /></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute><Teachers /></ProtectedRoute>} />
          <Route path="/teachers/:id" element={<ProtectedRoute><TeacherDetails /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><ManageUsers /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
          <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
          <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
