export type NavKey =
  | '/dashboard' | '/announcements' | '/notifications' | '/messaging'
  | '/admissions' | '/students' | '/teachers'
  | '/classes' | '/subjects' | '/timetable' | '/attendance' | '/teacher-attendance'
  | '/homework' | '/exams' | '/calendar' | '/library' | '/transport' | '/certificates'
  | '/fee-structures' | '/student-fees'
  | '/payroll/salary-structures' | '/payroll/runs'
  | '/leave/my' | '/leave/approvals' | '/leave/types' | '/student-leaves/approvals'
  | '/reports' | '/data-tools' | '/approvals'
  | '/setup' | '/settings' | '/users' | '/audit-logs' | '/institution-setup' | '/profile'
  | '/visitors' | '/assets' | '/alumni';

// We map normalized lowercase keys to ensure no case mismatch errors.
export const ROLE_NAV: Record<string, string[]> = {
  super_admin: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/admissions', '/students', '/teachers',
    '/classes', '/subjects', '/timetable', '/attendance', '/teacher-attendance',
    '/homework', '/exams', '/calendar', '/library', '/transport', '/certificates',
    '/fee-structures', '/student-fees',
    '/payroll/salary-structures', '/payroll/runs',
    '/leave/my', '/leave/approvals', '/leave/types', '/student-leaves/approvals',
    '/reports', '/data-tools', '/approvals',
    '/setup', '/settings', '/users', '/audit-logs', '/institution-setup', '/profile',
    '/visitors', '/assets', '/alumni'
  ],
  principal: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/admissions', '/students', '/teachers',
    '/classes', '/subjects', '/timetable', '/attendance', '/teacher-attendance',
    '/homework', '/exams', '/calendar', '/library', '/transport', '/certificates',
    '/fee-structures', '/student-fees',
    '/payroll/salary-structures', '/payroll/runs',
    '/leave/my', '/leave/approvals', '/leave/types', '/student-leaves/approvals',
    '/reports', '/data-tools', '/approvals',
    '/setup', '/settings', '/users', '/audit-logs', '/institution-setup', '/profile',
    '/visitors', '/assets', '/alumni'
  ],
  admin: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/admissions', '/students', '/teachers',
    '/classes', '/subjects', '/timetable', '/attendance', '/teacher-attendance',
    '/homework', '/exams', '/calendar', '/library', '/transport', '/certificates',
    '/fee-structures', '/student-fees',
    '/payroll/salary-structures', '/payroll/runs',
    '/leave/my', '/leave/approvals', '/leave/types', '/student-leaves/approvals',
    '/reports', '/data-tools', '/approvals',
    '/setup', '/settings', '/users', '/audit-logs', '/institution-setup', '/profile',
    '/visitors', '/assets', '/alumni'
  ],
  hod: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/admissions', '/students', '/teachers',
    '/classes', '/subjects', '/timetable', '/attendance', '/teacher-attendance',
    '/homework', '/exams', '/calendar', '/library', '/certificates',
    '/fee-structures', '/student-fees',
    '/leave/my', '/student-leaves/approvals',
    '/reports', '/approvals', '/setup', '/profile',
    '/visitors', '/alumni'
  ],
  teacher: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/students',
    '/timetable', '/attendance', '/homework', '/exams', '/calendar', '/library',
    '/student-fees',
    '/leave/my', '/student-leaves/approvals',
    '/profile'
  ],
  accountant: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/students',
    '/fee-structures', '/student-fees',
    '/reports',
    '/leave/my',
    '/profile'
  ],
  student: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/homework', '/timetable', '/library',
    '/student-fees',
    '/leave/my',
    '/profile'
  ],
  parent: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/homework', '/timetable', '/library',
    '/student-fees',
    '/leave/my',
    '/profile'
  ]
};

export const isAllowedNav = (userRoles: string[], path: string): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  // If user has any role that is allowed access to the path, return true.
  return userRoles.some(role => {
    const normalized = role.toLowerCase().replace(' ', '_').replace('role-', '');
    const allowedPaths = ROLE_NAV[normalized];
    return allowedPaths ? allowedPaths.includes(path) : false;
  });
};
