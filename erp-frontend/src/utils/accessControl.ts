export interface AccessSubject {
  roles?: string[];
  role?: string;
  permissions?: string[];
}

export interface AccessPolicy {
  roles?: string[];
  permissions?: string[];
  permissionMode?: 'any' | 'all';
}

export function normalizeAccessKey(value: string): string {
  return value.toLowerCase().replace(/^role[-_\s]+/, '').replace(/[\s-]+/g, '_');
}

export function getUserRoles(subject: AccessSubject | null | undefined): string[] {
  if (!subject) return [];
  const roles = subject.roles && subject.roles.length > 0 ? subject.roles : (subject.role ? [subject.role] : []);
  return roles.filter(Boolean);
}

export function isSuperAdminRole(role: string): boolean {
  return normalizeAccessKey(role) === 'super_admin';
}

export function hasPermission(userPermissions: string[] | undefined, permission: string): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  return userPermissions.includes(permission);
}

export function hasAnyPermission(userPermissions: string[] | undefined, permissions: string[]): boolean {
  if (!userPermissions || userPermissions.length === 0 || permissions.length === 0) return false;
  return permissions.some(permission => userPermissions.includes(permission));
}

export function hasAllPermissions(userPermissions: string[] | undefined, permissions: string[]): boolean {
  if (!userPermissions || userPermissions.length === 0 || permissions.length === 0) return false;
  return permissions.every(permission => userPermissions.includes(permission));
}

export function hasAnyRole(userRoles: string[] | undefined, allowedRoles: string[]): boolean {
  if (!userRoles || userRoles.length === 0 || allowedRoles.length === 0) return false;
  const normalizedAllowedRoles = allowedRoles.map(normalizeAccessKey);
  return userRoles.some(role => normalizedAllowedRoles.includes(normalizeAccessKey(role)));
}

export function canAccess(subject: AccessSubject | null | undefined, policy?: AccessPolicy): boolean {
  if (!policy || (!policy.roles?.length && !policy.permissions?.length)) return true;

  const roles = getUserRoles(subject);
  const permissions = subject?.permissions || [];

  if (roles.some(isSuperAdminRole)) return true;

  const roleAllowed = policy.roles?.length ? hasAnyRole(roles, policy.roles) : true;
  const permissionAllowed = policy.permissions?.length
    ? policy.permissionMode === 'all'
      ? hasAllPermissions(permissions, policy.permissions)
      : hasAnyPermission(permissions, policy.permissions)
    : true;

  return roleAllowed && permissionAllowed;
}
