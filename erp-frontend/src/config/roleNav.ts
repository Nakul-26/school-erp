export type NavKey =
  | '/dashboard' | '/announcements' | '/notifications' | '/messaging'
  | '/admissions' | '/students' | '/teachers'
  | '/classes' | '/subjects' | '/timetable' | '/attendance' | '/teacher-attendance'
  | '/homework' | '/exams' | '/calendar' | '/library' | '/transport' | '/certificates'
  | '/fee-structures' | '/student-fees'
  | '/payroll/salary-structures' | '/payroll/runs'
  | '/leave/my' | '/leave/approvals' | '/leave/types' | '/student-leaves/approvals'
  | '/reports' | '/data-tools' | '/approvals'
  | '/setup' | '/settings' | '/users' | '/access-control' | '/audit-logs' | '/institution-setup' | '/profile'
  | '/visitors' | '/assets' | '/alumni'
  | '/academic-setup' | '/finance' | '/communication';

export const PERMISSION_NAV: Record<string, string[]> = {
  'student.view': ['/students'],
  'teacher.view': ['/teachers'],
  'student.create': ['/admissions'],
  'academic.manage': ['/academic-setup', '/classes', '/subjects', '/academic-years', '/departments', '/admissions', '/approvals', '/setup'],
  'finance.access': ['/finance', '/fee-structures', '/student-fees', '/payroll/runs', '/payroll/salary-structures'],
  'user.manage': ['/access-control', '/users'],
  'institution.manage': ['/settings', '/institution-setup'],
  'audit.view': ['/audit-logs']
};

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
    '/setup', '/settings', '/users', '/access-control', '/audit-logs', '/institution-setup', '/profile',
    '/visitors', '/assets', '/alumni',
    '/academic-setup', '/finance', '/communication'
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
    '/setup', '/settings', '/users', '/access-control', '/audit-logs', '/institution-setup', '/profile',
    '/visitors', '/assets', '/alumni',
    '/academic-setup', '/finance', '/communication'
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
    '/setup', '/settings', '/users', '/access-control', '/audit-logs', '/institution-setup', '/profile',
    '/visitors', '/assets', '/alumni',
    '/academic-setup', '/finance', '/communication'
  ],
  hod: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/admissions', '/students', '/teachers',
    '/classes', '/subjects', '/timetable', '/attendance', '/teacher-attendance',
    '/homework', '/exams', '/calendar', '/library', '/certificates',
    '/fee-structures', '/student-fees',
    '/leave/my', '/student-leaves/approvals',
    '/reports', '/approvals', '/setup', '/profile',
    '/visitors', '/alumni',
    '/academic-setup', '/finance', '/communication'
  ],
  teacher: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/students',
    '/timetable', '/attendance', '/homework', '/exams', '/calendar', '/library',
    '/student-fees',
    '/leave/my', '/student-leaves/approvals',
    '/profile',
    '/communication'
  ],
  accountant: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/students',
    '/fee-structures', '/student-fees',
    '/reports',
    '/leave/my',
    '/profile',
    '/finance', '/communication'
  ],
  student: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/homework', '/timetable', '/library',
    '/student-fees',
    '/leave/my',
    '/profile',
    '/finance', '/communication'
  ],
  parent: [
    '/dashboard', '/announcements', '/notifications', '/messaging',
    '/homework', '/timetable', '/library',
    '/student-fees',
    '/leave/my',
    '/profile',
    '/finance', '/communication'
  ]
};

export const isAllowedNav = (userRoles: string[], userPermissions: string[] | undefined, path: string): boolean => {
  if (userPermissions && userPermissions.length > 0) {
    const allowedByPermission = Object.entries(PERMISSION_NAV).some(([permission, paths]) => {
      return userPermissions.includes(permission) && paths.includes(path);
    });
    if (allowedByPermission) return true;
  }

  if (!userRoles || userRoles.length === 0) return false;
  // If user has any role that is allowed access to the path, return true.
  return userRoles.some(role => {
    const normalized = role.toLowerCase().replace(' ', '_').replace('role-', '');
    const allowedPaths = ROLE_NAV[normalized];
    return allowedPaths ? allowedPaths.includes(path) : false;
  });
};
