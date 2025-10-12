import React, { useEffect, useState } from 'react';
import { AuthManager } from '../auth';

/**
 * AuthGuard - Protects routes from unauthorized access
 * Follows Nielsen's HCI Principle 1: Visibility of system status
 */
export default function AuthGuard({ children, requiredRole = null }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Check if user has valid authentication
        const hasAuth = AuthManager.isAuthenticated();
        const userData = AuthManager.getUser();
        
        if (!hasAuth || !userData) {
          console.log('🚫 AuthGuard: No authentication found, redirecting to login');
          window.location.href = '/login';
          return;
        }

        // Check role requirements
        if (requiredRole && userData.role !== requiredRole) {
          console.log('🚫 AuthGuard: Role mismatch', {
            required: requiredRole,
            actual: userData.role
          });
          
          // Redirect to appropriate dashboard based on actual role
          const dashboardUrl = AuthManager.getDashboardUrl();
          window.location.href = dashboardUrl;
          return;
        }

        // Validate session with backend
        const sessionValidation = await AuthManager.validateSession();
        
        if (!sessionValidation.valid) {
          console.log('🚫 AuthGuard: Session validation failed, redirecting to login');
          AuthManager.clearAuth();
          window.location.href = '/login';
          return;
        }

        // Authentication successful
        setUser(userData);
        setIsAuthenticated(true);
        
      } catch (error) {
        console.error('AuthGuard: Authentication check failed:', error);
        AuthManager.clearAuth();
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, [requiredRole]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Render protected content if authenticated
  if (isAuthenticated && user) {
    return children;
  }

  // Fallback (should not reach here due to redirects above)
  return null;
}
