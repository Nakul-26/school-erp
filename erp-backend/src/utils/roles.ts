export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  HOD: 'hod',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  GUARDIAN: 'guardian',
  ACCOUNTANT: 'accountant',
} as const;

export function normalizeRole(role: string): string {
  if (!role) return '';
  const r = role.trim().toLowerCase().replace(/\s+/g, '_');
  if (r === 'super_admin' || r === 'superadmin' || r === 'role-super-admin') return ROLES.SUPER_ADMIN;
  if (r === 'admin' || r === 'administrator') return ROLES.ADMIN;
  if (r === 'principal') return ROLES.PRINCIPAL;
  if (r === 'hod' || r === 'head_of_department') return ROLES.HOD;
  if (r === 'teacher') return ROLES.TEACHER;
  if (r === 'student') return ROLES.STUDENT;
  if (r === 'parent' || r === 'guardian') return ROLES.PARENT;
  if (r === 'accountant') return ROLES.ACCOUNTANT;
  return r;
}

export function hasAnyRole(userRoles: string[], targetRoles: string[]): boolean {
  const normalizedUserRoles = (userRoles || []).map(normalizeRole);
  const normalizedTargetRoles = (targetRoles || []).map(normalizeRole);

  return normalizedUserRoles.some((ur) =>
    normalizedTargetRoles.includes(ur) ||
    ur === ROLES.SUPER_ADMIN ||
    ur === ROLES.ADMIN ||
    ur === ROLES.PRINCIPAL
  );
}
