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
      
      // Skip auth check for public routes - EXPANDED to prevent redirects
      if (currentPath === '/login' || currentPath === '/' || currentPath === '/register' || 
          currentPath.includes('/auth/') || currentPath.includes('/password')) {
        console.log('AuthCheck: Skipping auth check for public route:', currentPath);
        setIsInitialized(true);
        return;
      }

      // CRITICAL FIX: Check if redirect is already in progress
      const redirectInProgress = sessionStorage.getItem('auth_redirect_in_progress');
      if (redirectInProgress === 'true') {
        console.log('AuthCheck: Redirect already in progress, skipping to prevent loop');
        setIsInitialized(true);
        return;
      }

      // Wait for auth to load
      if (isLoading) {
        return;
      }

      // Use useAuth hook as primary source of truth (now properly synced)
      if (!isAuthenticated) {
        console.log('AuthCheck: User not authenticated, redirecting to login');
        // Set flag to prevent infinite redirect loop
        sessionStorage.setItem('auth_redirect_in_progress', 'true');
        router.visit('/login', {
          onFinish: () => {
            // Clear redirect flag after navigation completes
            sessionStorage.removeItem('auth_redirect_in_progress');
          }
        });
        return;
      }
      
      console.log('AuthCheck: User authenticated:', {
        isAuthenticated,
        currentPath,
        userRole: user?.role
      });

      // Check role authorization if specified
      const authUser = AuthManager.getUser();
      if (allowedRoles && authUser) {
        const userRole = authUser.role?.toLowerCase();
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
      if (authUser && !AuthManager.isValidPageForUser(currentPath, authUser.role)) {
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
