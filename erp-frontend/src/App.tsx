import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import SkeletonLoader from './components/SkeletonLoader';

const AccessDenied = lazy(() => import('./pages/AccessDenied'));
const RegisterInstitution = lazy(() => import('./pages/RegisterInstitution'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ManageUsers = lazy(() => import('./pages/ManageUsers'));
const InstitutionSetup = lazy(() => import('./pages/InstitutionSetup'));
const SuperAdminInstitutions = lazy(() => import('./pages/SuperAdminInstitutions'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const AcademicYears = lazy(() => import('./pages/AcademicYears'));
const Departments = lazy(() => import('./pages/Departments'));
const Classes = lazy(() => import('./pages/Classes'));
const Placements = lazy(() => import('./pages/Placements'));
const SectionWorkspace = lazy(() => import('./pages/SectionWorkspace'));
const Subjects = lazy(() => import('./pages/Subjects'));
const SubjectWorkspace = lazy(() => import('./pages/SubjectWorkspace'));
const AcademicCalendar = lazy(() => import('./pages/AcademicCalendar'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Students = lazy(() => import('./pages/Students'));
const StudentDetails = lazy(() => import('./pages/StudentDetails'));
const Teachers = lazy(() => import('./pages/Teachers'));
const TeacherDetails = lazy(() => import('./pages/TeacherDetails'));
const Exams = lazy(() => import('./pages/Exams'));
const Profile = lazy(() => import('./pages/Profile'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const ApprovalsInbox = lazy(() => import('./pages/ApprovalsInbox'));
const LeaveTypes = lazy(() => import('./pages/LeaveTypes'));
const MyLeaveApplications = lazy(() => import('./pages/MyLeaveApplications'));
const LeaveApprovals = lazy(() => import('./pages/LeaveApprovals'));
const JobCenter = lazy(() => import('./pages/JobCenter'));
const DocumentCenter = lazy(() => import('./pages/DocumentCenter'));
const AnalyticsCenter = lazy(() => import('./pages/AnalyticsCenter'));
const IntegrationCenter = lazy(() => import('./pages/IntegrationCenter'));

const PayrollRunDetail = lazy(() => import('./pages/PayrollRunDetail'));
const StudentLeaveApprovals = lazy(() => import('./pages/StudentLeaveApprovals'));
const HomeworkList = lazy(() => import('./pages/HomeworkList'));

// ── V2 Merged Pages ──────────────────────────────────────────────────────────
const Admissions = lazy(() => import('./pages/Admissions'));
const DataTools = lazy(() => import('./pages/DataTools'));
const Reports = lazy(() => import('./pages/Reports'));
const Library = lazy(() => import('./pages/Library'));
const Transport = lazy(() => import('./pages/Transport'));
const Hostel = lazy(() => import('./pages/Hostel'));
const Canteen = lazy(() => import('./pages/Canteen'));
const StudyMaterials = lazy(() => import('./pages/StudyMaterials'));
const GLAccounting = lazy(() => import('./pages/GLAccounting'));
const Compliance = lazy(() => import('./pages/Compliance'));
const Certificates = lazy(() => import('./pages/Certificates'));
const TimetablePage = lazy(() => import('./pages/TimetablePage'));
const SchoolSetup = lazy(() => import('./pages/SchoolSetup'));
const Visitors = lazy(() => import('./pages/Visitors'));
const Assets = lazy(() => import('./pages/Assets'));
const Alumni = lazy(() => import('./pages/Alumni'));
const AcademicSetup = lazy(() => import('./pages/AcademicSetup'));
const Finance = lazy(() => import('./pages/Finance'));
const Communication = lazy(() => import('./pages/Communication'));

import ErrorBoundary from './components/ErrorBoundary';

function RouteFallback() {
  return (
    <div style={{ padding: '2rem' }}>
      <SkeletonLoader type="list" count={4} />
    </div>
  );
}

function App() {
  useEffect(() => {
    // 1. Prevent scroll wheel from changing numbers on type="number" inputs
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        (target as HTMLInputElement).blur();
      }
    };

    // 2. Select text on focus for type="number" inputs to prevent default value "0" appending issues
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        setTimeout(() => {
          (target as HTMLInputElement).select();
        }, 0);
      }
    };

    document.addEventListener('wheel', handleWheel);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
        <ConfirmDialogProvider>
          <Router>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register-institution" element={<RegisterInstitution />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* ── People ──────────────────────────────────────────────────── */}
          <Route path="/students" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']} allowedPermissions={['student.view']}><Students /></ProtectedRoute>} />
          <Route path="/students/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']} allowedPermissions={['student.view']}><StudentDetails /></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']} allowedPermissions={['teacher.view']}><Teachers /></ProtectedRoute>} />
          <Route path="/teachers/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher']} allowedPermissions={['teacher.view']}><TeacherDetails /></ProtectedRoute>} />

          {/* ── Admissions (V2 merged) ───────────────────────────────────── */}
          <Route path="/admissions" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Admissions /></ProtectedRoute>} />
          {/* Legacy redirects */}
          <Route path="/admissions/inquiries" element={<Navigate to="/admissions" replace />} />
          <Route path="/admissions/applications" element={<Navigate to="/admissions?tab=applications" replace />} />

          {/* ── Academic Setup ── */}
          <Route path="/academic-setup" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']} allowedPermissions={['academic.manage']}><AcademicSetup /></ProtectedRoute>} />

          {/* ── Finance ── */}
          <Route path="/finance" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Accountant', 'Student', 'Parent', 'Guardian']} allowedPermissions={['finance.access']}><Finance /></ProtectedRoute>} />

          {/* ── Communication ── */}
          <Route path="/communication" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher', 'Accountant', 'Student', 'Parent', 'Guardian']}><Communication /></ProtectedRoute>} />

          {/* ── Academics ───────────────────────────────────────────────── */}
          <Route path="/academic-years" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><AcademicYears /></ProtectedRoute>} />
          <Route path="/departments" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Departments /></ProtectedRoute>} />
          <Route path="/programs" element={<Navigate to="/classes?tab=courses" replace />} />
          <Route path="/classes" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Classes /></ProtectedRoute>} />
          <Route path="/classes/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><SectionWorkspace /></ProtectedRoute>} />
          <Route path="/subjects" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Subjects /></ProtectedRoute>} />
          <Route path="/subjects/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><SubjectWorkspace /></ProtectedRoute>} />
          <Route path="/allocations" element={<Navigate to="/academic-setup?tab=assignments" replace />} />
          <Route path="/approvals" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><ApprovalsInbox /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><AcademicCalendar /></ProtectedRoute>} />
          
          {/* ── Timetable (V2 merged) ────────────────────────────────────── */}
          <Route path="/timetable" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><TimetablePage /></ProtectedRoute>} />
          {/* Legacy redirect for timetable-slots */}
          <Route path="/timetable-slots" element={<Navigate to="/timetable?tab=periods" replace />} />

          {/* ── Attendance ──────────────────────────────────────────────── */}
          <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><Attendance /></ProtectedRoute>} />
          <Route path="/teacher-attendance" element={<Navigate to="/attendance?tab=teachers" replace />} />

          {/* ── Exams & Homework ─────────────────────────────────────────── */}
          <Route path="/exams" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><Exams /></ProtectedRoute>} />
          <Route path="/placements" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']} allowedPermissions={['academic.manage']}><Placements /></ProtectedRoute>} />
          <Route path="/homework" element={<ProtectedRoute allowedPermissions={['homework.view']}><HomeworkList /></ProtectedRoute>} />

          {/* ── Communication ────────────────────────────────────────────── */}
          <Route path="/announcements" element={<Navigate to="/communication?tab=announcements" replace />} />
          <Route path="/notifications" element={<Navigate to="/communication?tab=notifications" replace />} />
          <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
          <Route path="/transport" element={<ProtectedRoute><Transport /></ProtectedRoute>} />
          <Route path="/hostel" element={<ProtectedRoute><Hostel /></ProtectedRoute>} />
          <Route path="/canteen" element={<ProtectedRoute><Canteen /></ProtectedRoute>} />
          <Route path="/study-materials" element={<ProtectedRoute><StudyMaterials /></ProtectedRoute>} />
          <Route path="/gl-accounting" element={<ProtectedRoute><GLAccounting /></ProtectedRoute>} />
          <Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
          <Route path="/certificates" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher']}><Certificates /></ProtectedRoute>} />
          <Route path="/messaging" element={<Navigate to="/communication?tab=inbox" replace />} />

          {/* ── Finance ─────────────────────────────────────────────────── */}
          <Route path="/fee-structures" element={<Navigate to="/finance?tab=structures" replace />} />
          <Route path="/student-fees" element={<Navigate to="/finance?tab=collection" replace />} />
          <Route path="/fee-reports" element={<Navigate to="/reports?tab=fees" replace />} />
          <Route path="/payroll/salary-structures" element={<Navigate to="/finance?tab=salary-structures" replace />} />
          <Route path="/payroll/runs" element={<Navigate to="/finance?tab=payroll" replace />} />
          <Route path="/payroll/runs/:id" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><PayrollRunDetail /></ProtectedRoute>} />

          {/* ── Leave Management ─────────────────────────────────────────── */}
          <Route path="/leave/types" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><LeaveTypes /></ProtectedRoute>} />
          <Route path="/leave/my" element={<ProtectedRoute><MyLeaveApplications /></ProtectedRoute>} />
          <Route path="/leave/approvals" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><LeaveApprovals /></ProtectedRoute>} />
          <Route path="/student-leaves/approvals" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'teacher']}><StudentLeaveApprovals /></ProtectedRoute>} />

          {/* ── Reports (V2 merged) ──────────────────────────────────────── */}
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'Accountant']}><Reports /></ProtectedRoute>} />
          {/* Legacy redirects */}
          <Route path="/attendance-reports" element={<Navigate to="/reports?tab=attendance" replace />} />
          <Route path="/teacher-reports" element={<Navigate to="/reports?tab=teacher" replace />} />

          {/* ── Profile ──────────────────────────────────────────────────── */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* ── Settings & Setup ─────────────────────────────────────────── */}
          <Route path="/users" element={<Navigate to="/access-control" replace />} />
          <Route path="/access-control" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><ManageUsers /></ProtectedRoute>} />
          <Route path="/institution-setup" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><InstitutionSetup /></ProtectedRoute>} />
          <Route path="/super-admin/institutions" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminInstitutions /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']} allowedPermissions={['institution.manage']}><SystemSettings /></ProtectedRoute>} />
          <Route path="/settings/grades" element={<Navigate to="/settings?tab=grades" replace />} />
          <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']} allowedPermissions={['audit.view']}><AuditLogs /></ProtectedRoute>} />
          <Route path="/job-center" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><JobCenter /></ProtectedRoute>} />
          <Route path="/document-center" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'Accountant']}><DocumentCenter /></ProtectedRoute>} />
          <Route path="/analytics-center" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'Accountant']}><AnalyticsCenter /></ProtectedRoute>} />
          <Route path="/analytics" element={<Navigate to="/analytics-center" replace />} />
          <Route path="/integration-center" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><IntegrationCenter /></ProtectedRoute>} />
          <Route path="/webhooks" element={<Navigate to="/integration-center" replace />} />
          <Route path="/setup" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><SchoolSetup /></ProtectedRoute>} />

          {/* ── Data Tools (V2 merged) ───────────────────────────────────── */}
          <Route path="/data-tools" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><DataTools /></ProtectedRoute>} />
          
          {/* ── Remaining Modules (Phase 5) ─────────────────────────────── */}
          <Route path="/visitors" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Visitors /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal']}><Assets /></ProtectedRoute>} />
          <Route path="/alumni" element={<ProtectedRoute allowedRoles={['admin', 'super_admin', 'Principal', 'HOD']}><Alumni /></ProtectedRoute>} />
          
          {/* Legacy redirects */}
          <Route path="/exports" element={<Navigate to="/data-tools" replace />} />
          <Route path="/imports" element={<Navigate to="/data-tools?tab=import" replace />} />
          
          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
      </Router>
        </ConfirmDialogProvider>
      </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
