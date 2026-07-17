import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasAnyPermission, hasAnyRole } from '../utils/accessControl';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowedPermissions?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, allowedPermissions }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userPermissions = user.permissions || [];

  const hasRole = allowedRoles ? hasAnyRole(user.roles || (user.role ? [user.role] : []), allowedRoles) : false;
  const hasPermission = allowedPermissions ? hasAnyPermission(userPermissions, allowedPermissions) : false;

  const hasAccess = (!allowedRoles && !allowedPermissions) ? true : hasRole || hasPermission;

  if (!hasAccess) {
    return <Navigate to="/access-denied" state={{ reason: 'You do not have permission to access this page.' }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
