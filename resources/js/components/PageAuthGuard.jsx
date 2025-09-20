import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { AuthManager } from '../auth';
import LoadingScreen from './LoadingScreen';

const PageAuthGuard = ({ 
  children, 
  allowedRoles = null, 
  redirectTo = '/login',
  requireAuth = true 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        console.log('PageAuthGuard: Starting auth check...');
        
        // If auth is not required, allow access
        if (!requireAuth) {
          console.log('PageAuthGuard: Auth not required, allowing access');
          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }

        // Check basic authentication
        const isAuthenticated = AuthManager.isAuthenticated();
        const user = AuthManager.getUser();
        
        console.log('PageAuthGuard: Auth check results:', {
          isAuthenticated,
          userExists: !!user,
          userRole: user?.role,
          allowedRoles
        });

        if (!isAuthenticated || !user) {
          console.log('PageAuthGuard: Not authenticated, redirecting to login');
          // Not authenticated, redirect to login
          router.visit(redirectTo);
          return;
        }

        // Check role authorization if specified
        if (allowedRoles) {
          const userRole = user.role;
          const hasValidRole = Array.isArray(allowedRoles) 
            ? allowedRoles.includes(userRole)
            : allowedRoles === userRole;

          console.log('PageAuthGuard: Role check:', {
            userRole,
            allowedRoles,
            hasValidRole
          });

          if (!hasValidRole) {
            console.log('PageAuthGuard: Wrong role, redirecting to dashboard');
            // Wrong role, redirect to appropriate dashboard
            const dashboardUrl = AuthManager.getDashboardUrl();
            router.visit(dashboardUrl);
            return;
          }
        }

        // All checks passed
        console.log('PageAuthGuard: All checks passed, allowing access');
        setIsAuthorized(true);
        
        // Update last activity
        AuthManager.updateLastActivity();
        
      } catch (error) {
        console.error('PageAuthGuard: Auth check error:', error);
        // On error, redirect to login for safety
        router.visit(redirectTo);
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure AuthManager is fully initialized
    const timeoutId = setTimeout(checkAuth, 100);
    
    return () => clearTimeout(timeoutId);
  }, [allowedRoles, redirectTo, requireAuth]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <LoadingScreen 
        title="Verifying Access"
        message="Checking your permissions..."
        type="validating"
      />
    );
  }

  // Show nothing if not authorized (redirect is in progress)
  if (!isAuthorized) {
    return null;
  }

  // Render protected content
  return children;
};

export default PageAuthGuard;
