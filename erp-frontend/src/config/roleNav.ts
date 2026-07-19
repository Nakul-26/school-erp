import { type AccessPolicy, type AccessSubject, canAccess, getUserRoles, normalizeAccessKey } from '../utils/accessControl';

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

const ADMIN_ROLES = ['admin', 'super_admin', 'Principal'];
const ACADEMIC_MANAGER_ROLES = [...ADMIN_ROLES, 'HOD'];
const STAFF_ROLES = [...ACADEMIC_MANAGER_ROLES, 'Teacher'];
const FINANCE_ROLES = [...ACADEMIC_MANAGER_ROLES, 'Accountant'];
const PORTAL_ROLES = [...FINANCE_ROLES, 'Teacher', 'Student', 'Parent', 'Guardian'];

export const ROUTE_POLICIES: Record<string, AccessPolicy> = {
  '/dashboard': { roles: PORTAL_ROLES, permissions: ['dashboard.access'] },
  '/profile': { roles: PORTAL_ROLES, permissions: ['profile.access'] },

  '/students': { roles: STAFF_ROLES, permissions: ['student.view'] },
  '/students/:id': { roles: STAFF_ROLES, permissions: ['student.view'] },
  '/teachers': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['teacher.view'] },
  '/teachers/:id': { roles: STAFF_ROLES, permissions: ['teacher.view'] },
  '/admissions': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['admissions.view', 'admissions.manage', 'student.create'] },

  '/academic-setup': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['academic.manage'] },
  '/academic-years': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['academic.manage'] },
  '/departments': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['academic.manage'] },
  '/classes': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['academic.manage'] },
  '/classes/:id': { roles: STAFF_ROLES, permissions: ['academic.manage'] },
  '/subjects': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['academic.manage'] },
  '/subjects/:id': { roles: STAFF_ROLES, permissions: ['academic.manage'] },
  '/approvals': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['approvals.view', 'approvals.manage', 'academic.manage'] },
  '/calendar': { roles: STAFF_ROLES, permissions: ['calendar.view', 'calendar.manage'] },
  '/timetable': { roles: STAFF_ROLES, permissions: ['timetable.view', 'timetable.manage'] },

  '/attendance': { roles: STAFF_ROLES, permissions: ['attendance.view', 'attendance.mark'] },
  '/teacher-attendance': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['teacher_attendance.view', 'teacher_attendance.manage'] },
  '/exams': { roles: STAFF_ROLES, permissions: ['exams.view', 'exams.manage', 'results.manage'] },
  '/homework': { roles: ['admin', 'super_admin', 'Principal', 'HOD', 'Teacher', 'Student', 'Parent', 'Guardian'], permissions: ['homework.view'] },

  '/communication': { roles: PORTAL_ROLES, permissions: ['communication.access'] },
  '/announcements': { roles: PORTAL_ROLES, permissions: ['announcements.view', 'announcements.manage'] },
  '/notifications': { roles: PORTAL_ROLES, permissions: ['notifications.view'] },
  '/messaging': { roles: PORTAL_ROLES, permissions: ['messaging.access'] },
  '/library': { roles: PORTAL_ROLES, permissions: ['library.access', 'library.manage'] },
  '/transport': { roles: PORTAL_ROLES, permissions: ['transport.view', 'transport.manage'] },
  '/certificates': { roles: STAFF_ROLES, permissions: ['certificates.view', 'certificates.manage'] },

  '/finance': { roles: [...FINANCE_ROLES, 'Student', 'Parent', 'Guardian'], permissions: ['finance.access', 'fees.view', 'fees.collect'] },
  '/fee-structures': { roles: FINANCE_ROLES, permissions: ['finance.access', 'fees.view'] },
  '/student-fees': { roles: [...FINANCE_ROLES, 'Student', 'Parent', 'Guardian'], permissions: ['finance.access', 'fees.view', 'fees.collect'] },
  '/payroll/salary-structures': { roles: ADMIN_ROLES, permissions: ['payroll.manage'] },
  '/payroll/runs': { roles: ADMIN_ROLES, permissions: ['payroll.manage'] },
  '/payroll/runs/:id': { roles: ADMIN_ROLES, permissions: ['payroll.manage'] },

  '/leave/my': { roles: PORTAL_ROLES, permissions: ['leave.apply', 'leave.review', 'leave.manage'] },
  '/leave/approvals': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['leave.review'] },
  '/leave/types': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['leave.manage'] },
  '/student-leaves/approvals': { roles: STAFF_ROLES, permissions: ['student_leave.review'] },

  '/reports': { roles: [...STAFF_ROLES, 'Accountant'], permissions: ['reports.access'] },
  '/data-tools': { roles: ADMIN_ROLES, permissions: ['data_tools.manage'] },
  '/access-control': { roles: ADMIN_ROLES, permissions: ['user.manage'] },
  '/users': { roles: ADMIN_ROLES, permissions: ['user.manage'] },
  '/institution-setup': { roles: ADMIN_ROLES, permissions: ['institution.manage'] },
  '/settings': { roles: ADMIN_ROLES, permissions: ['institution.manage'] },
  '/settings/grades': { roles: ADMIN_ROLES, permissions: ['institution.manage'] },
  '/audit-logs': { roles: ADMIN_ROLES, permissions: ['audit.view'] },
  '/setup': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['setup.manage'] },
  '/visitors': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['visitors.manage'] },
  '/assets': { roles: ADMIN_ROLES, permissions: ['assets.manage'] },
  '/alumni': { roles: ACADEMIC_MANAGER_ROLES, permissions: ['alumni.manage'] }
};

export const PERMISSION_NAV: Record<string, string[]> = Object.entries(ROUTE_POLICIES).reduce<Record<string, string[]>>((acc, [path, policy]) => {
  for (const permission of policy.permissions || []) {
    acc[permission] = [...(acc[permission] || []), path];
  }
  return acc;
}, {});

export const ROLE_NAV: Record<string, string[]> = Object.entries(ROUTE_POLICIES).reduce<Record<string, string[]>>((acc, [path, policy]) => {
  for (const role of policy.roles || []) {
    const key = normalizeAccessKey(role);
    acc[key] = [...(acc[key] || []), path];
  }
  return acc;
}, {});

const routePatternCache = new Map<string, RegExp>();

function toRoutePattern(routePath: string): RegExp {
  const cached = routePatternCache.get(routePath);
  if (cached) return cached;
  const escaped = routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped.replace(/:[^/]+/g, '[^/]+')}$`);
  routePatternCache.set(routePath, pattern);
  return pattern;
}

export function stripPath(path: string): string {
  return (path.split('?')[0] || '/').replace(/\/+$/, '') || '/';
}

export function getAccessPolicyForPath(path: string): AccessPolicy | undefined {
  const pathOnly = stripPath(path);
  if (ROUTE_POLICIES[pathOnly]) return ROUTE_POLICIES[pathOnly];
  return Object.entries(ROUTE_POLICIES).find(([routePath]) => toRoutePattern(routePath).test(pathOnly))?.[1];
}

export function canAccessPath(subject: AccessSubject | null | undefined, path: string): boolean {
  return canAccess(subject, getAccessPolicyForPath(path));
}

export const isAllowedNav = (userRoles: string[], userPermissions: string[] | undefined, path: string): boolean => {
  return canAccessPath({ roles: getUserRoles({ roles: userRoles }), permissions: userPermissions || [] }, path);
};
