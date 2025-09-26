import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { AuthManager } from '../auth';
import useAuth from '../hooks/useAuth';

/**
 * AuthCheck Component - Handles authentication state and page persistence
 * Ensures users stay on their current page after browser refresh
 */
const AuthCheck = ({ children, allowedRoles = null, fallbackUrl = null }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const handleAuthCheck = () => {
      const currentPath = window.location.pathname;
      
      // Store current page for persistence
      AuthManager.storeCurrentPage(currentPath);
      
      // Skip auth check for public routes
      if (currentPath === '/login' || currentPath === '/' || currentPath === '/register') {
        setIsInitialized(true);
        return;
      }

      // Wait for auth to load
      if (isLoading) {
        return;
      }

      // Check authentication
      if (!isAuthenticated) {
        console.log('AuthCheck: User not authenticated, redirecting to login');
        router.visit('/login');
        return;
      }

      // Check role authorization if specified
      if (allowedRoles && user) {
        const userRole = user.role?.toLowerCase();
        const allowed = Array.isArray(allowedRoles) 
          ? allowedRoles.map(role => role.toLowerCase()).includes(userRole)
          : allowedRoles.toLowerCase() === userRole;

        if (!allowed) {
          console.log('AuthCheck: User not authorized for this page, redirecting to dashboard');
          const dashboardUrl = AuthManager.getDashboardUrl();
          router.visit(dashboardUrl);
          return;
        }
      }

      // Validate current page for user role
      if (user && !AuthManager.isValidPageForUser(currentPath, user.role)) {
        console.log('AuthCheck: Invalid page for user role, redirecting to dashboard');
        const dashboardUrl = AuthManager.getDashboardUrl();
        router.visit(dashboardUrl);
        return;
      }

      // All checks passed
      setIsInitialized(true);
    };

    handleAuthCheck();
  }, [isAuthenticated, user, isLoading, allowedRoles]);

  // Show loading state while checking authentication
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
          <p className="text-gray-500 text-sm mt-1">Checking authentication</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthCheck;
