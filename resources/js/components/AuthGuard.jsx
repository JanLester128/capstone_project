import React from 'react';
import useAuth from '../hooks/useAuth';

const AuthGuard = ({ 
  children, 
  allowedRoles = null, 
  requireAuth = true,
  fallback = null 
}) => {
  const { isAuthenticated, isLoading, user, requireAuth: checkAuth } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirements
  if (requireAuth) {
    const isAuthorized = checkAuth(allowedRoles);
    if (!isAuthorized) {
      return fallback || null;
    }
  }

  // Render children if authorized
  return children;
};

export default AuthGuard;
