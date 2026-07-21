import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccess, type AccessPolicy } from '../utils/accessControl';
import { getAccessPolicyForPath } from '../config/roleNav';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowedPermissions?: string[];
  permissionMode?: AccessPolicy['permissionMode'];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, allowedPermissions, permissionMode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const explicitPolicy: AccessPolicy | undefined = allowedRoles || allowedPermissions
    ? {
        ...(allowedRoles ? { roles: allowedRoles } : {}),
        ...(allowedPermissions ? { permissions: allowedPermissions } : {}),
        ...(permissionMode ? { permissionMode } : {})
      }
    : undefined;
  const routePolicy = getAccessPolicyForPath(location.pathname);
  const policy = explicitPolicy && routePolicy
    ? {
        roles: [...(routePolicy.roles || []), ...(explicitPolicy.roles || [])],
        permissions: [...(routePolicy.permissions || []), ...(explicitPolicy.permissions || [])],
        ...((explicitPolicy.permissionMode || routePolicy.permissionMode) ? { permissionMode: explicitPolicy.permissionMode || routePolicy.permissionMode } : {})
      }
    : explicitPolicy || routePolicy;
  const hasAccess = canAccess(user, policy);

  if (!hasAccess) {
    return <Navigate to="/access-denied" state={{ reason: 'You do not have permission to access this page.' }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
