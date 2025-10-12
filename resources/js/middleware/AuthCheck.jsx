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
        
        // Check if we have basic auth data FIRST
        const hasBasicAuth = AuthManager.isAuthenticated();
        const user = AuthManager.getUser();
        const lastActivity = localStorage.getItem(AuthManager.LAST_ACTIVITY_KEY);
        
        console.log('AuthCheck: Initial auth check:', {
          hasBasicAuth,
          hasUser: !!user,
          userRole: user?.role,
          currentPath: window.location.pathname,
          lastActivity: lastActivity ? new Date(parseInt(lastActivity)).toLocaleString() : 'none'
        });
        
        // If user is authenticated, extend loading to prevent login flash
        const loadingDelay = hasBasicAuth && user ? 800 : 50;
        
        // Minimal delay - let Login component handle its own auth check
        await new Promise(resolve => setTimeout(resolve, loadingDelay));
        
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
        
        // Update last activity immediately to prevent session timeout
        AuthManager.updateLastActivity();
        
        // Check if user is on login page while authenticated
        const currentPath = window.location.pathname;
        if (currentPath === '/login' || currentPath === '/') {
          console.log('AuthCheck: Authenticated user on login page, redirecting to stored page or dashboard');
          
          // FIXED: Use getRedirectUrl to respect stored page preference
          const redirectUrl = AuthManager.getRedirectUrl();
          console.log('AuthCheck: Redirecting to:', redirectUrl);
          
          // Check for redirect loop prevention
          const redirectInProgress = sessionStorage.getItem('auth_redirect_in_progress');
          if (redirectInProgress === 'true') {
            console.log('AuthCheck: Redirect already in progress, skipping');
            return;
          }
          
          // Set redirect flag and redirect
          sessionStorage.setItem('auth_redirect_in_progress', 'true');
          setTimeout(() => {
            window.location.href = `http://127.0.0.1:8000${redirectUrl}`;
          }, 100);
          return;
        }
        
        // Validate session for better security
        try {
          const sessionValidation = await AuthManager.validateSession();
          
          setAuthState({
            isAuthenticated: true,
            user: sessionValidation.user || user,
            sessionValid: sessionValidation.valid
          });
        } catch (error) {
          console.warn('AuthCheck: Session validation failed, assuming valid for UX');
          setAuthState({
            isAuthenticated: true,
            user: user,
            sessionValid: true
          });
        }
        
        setIsLoading(false);

      } catch (error) {
        console.error('AuthCheck: Initialization error:', error);
        // On error, allow page to render
        setAuthState({
          isAuthenticated: false,
          user: null,
          sessionValid: false
        });
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Render immediately without loading screen
  // if (isLoading) {
  //   return (
  //     <LoadingScreen 
  //       title="Please wait..."
  //       message="Initializing application..."
  //       type="default"
  //     />
  //   );
  // }

  console.log('AuthCheck: Rendering children, auth state:', authState);
  
  // Always render children - let individual pages handle their own auth requirements
  return children;
};
