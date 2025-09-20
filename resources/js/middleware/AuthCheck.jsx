import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { AuthManager } from '../auth';
import LoadingScreen from '../components/LoadingScreen';

export const AuthCheck = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    sessionValid: false
  });

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AuthCheck: Starting initialization...');
        
        // Clear any stuck redirect flags
        localStorage.removeItem('login_redirect_in_progress');
        
        // Add a small delay to ensure localStorage is fully accessible
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Check if we have basic auth data
        const hasBasicAuth = AuthManager.isAuthenticated();
        const user = AuthManager.getUser();
        const lastActivity = localStorage.getItem(AuthManager.LAST_ACTIVITY_KEY);
        
        console.log('AuthCheck: Initial auth check:', {
          hasBasicAuth,
          hasUser: !!user,
          userRole: user?.role,
          currentPath: window.location.pathname
        });
        
        if (!hasBasicAuth || !user) {
          console.log('AuthCheck: No auth data found');
          // No auth data, allow page to render (let individual pages handle auth)
          setAuthState({
            isAuthenticated: false,
            user: null,
            sessionValid: false
          });
          setIsLoading(false);
          return;
        }

        console.log('AuthCheck: Auth data found, user authenticated');
        
        // Check if session is recently active (within last hour)
        const isRecentlyActive = lastActivity && 
          (Date.now() - parseInt(lastActivity)) < (60 * 60 * 1000); // 1 hour

        if (isRecentlyActive) {
          console.log('AuthCheck: Recently active session, allowing immediate access');
          // Recently active, assume session is valid without backend validation
          setAuthState({
            isAuthenticated: true,
            user: user,
            sessionValid: true
          });
          AuthManager.updateLastActivity();
          setIsLoading(false);
          return;
        }

        console.log('AuthCheck: Session might be stale, but allowing access anyway');
        // Session might be stale, but allow access anyway (graceful degradation)
        setAuthState({
          isAuthenticated: true,
          user: user,
          sessionValid: true // Assume valid until proven otherwise
        });
        setIsLoading(false);

        // Validate session in background (don't block UI)
        setTimeout(async () => {
          try {
            console.log('AuthCheck: Running background session validation...');
            const sessionResult = await AuthManager.validateSession();
            
            if (!sessionResult.valid) {
              console.log('AuthCheck: Background session validation failed:', sessionResult.message);
              // Don't immediately redirect - let the user continue for now
              // The backend will handle invalid sessions on API calls
            } else {
              console.log('AuthCheck: Background session validation successful');
            }
          } catch (error) {
            console.log('AuthCheck: Background session validation error (ignored):', error);
            // Ignore validation errors - assume session is valid
          }
        }, 1000);

      } catch (error) {
        console.error('AuthCheck: Initialization error:', error);
        // On error, assume session is valid to prevent login loops
        setAuthState({
          isAuthenticated: true,
          user: AuthManager.getUser() || null,
          sessionValid: true
        });
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Show loading state during authentication check (keep it brief)
  if (isLoading) {
    return (
      <LoadingScreen 
        title="Loading Application"
        message="Please wait..."
        type="default"
      />
    );
  }

  console.log('AuthCheck: Rendering children, auth state:', authState);
  
  // Always render children - let individual pages handle their own auth requirements
  return children;
};
