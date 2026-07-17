export function normalizeAccessKey(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, '');
}

export function hasPermission(userPermissions: string[] | undefined, permission: string): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  return userPermissions.includes(permission);
}

export function hasAnyPermission(userPermissions: string[] | undefined, permissions: string[]): boolean {
  if (!userPermissions || userPermissions.length === 0 || permissions.length === 0) return false;
  return permissions.some(permission => userPermissions.includes(permission));
}

export function hasAnyRole(userRoles: string[] | undefined, allowedRoles: string[]): boolean {
  if (!userRoles || userRoles.length === 0 || allowedRoles.length === 0) return false;
  const normalizedAllowedRoles = allowedRoles.map(normalizeAccessKey);
  return userRoles.some(role => normalizedAllowedRoles.includes(normalizeAccessKey(role)));
}
