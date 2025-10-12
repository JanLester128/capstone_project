import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { AuthManager } from '../auth';

// Module-level variable to track logging
let lastInitLog = 0;

const useAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    token: null
  });

  // Initialize authentication state from AuthManager (localStorage)
  const initializeAuth = useCallback(() => {
    try {
      // FIXED: More lenient auth check for browser refresh scenarios
      const user = AuthManager.getUser();
      const token = AuthManager.getToken();
      const hasAuthData = !!(user && token);
      
      // DISABLED: Logging to prevent console spam
      // if (!lastInitLog || (Date.now() - lastInitLog) > 10000) {
      //   console.log('useAuth: Initializing auth state:', {
      //     hasUser: !!user,
      //     hasToken: !!token,
      //     hasAuthData: hasAuthData,
      //     userRole: user?.role
      //   });
      //   lastInitLog = Date.now();
      // }
      
      // FIXED: Use simple auth data check instead of complex validation
      const newAuthState = {
        isAuthenticated: hasAuthData,
        user: user,
        token: token
      };
      
      setAuthState(newAuthState);
      
      // Set axios headers if we have auth data
      if (hasAuthData && token) {
        AuthManager.setAxiosAuth();
        // Update activity on auth initialization
        AuthManager.updateLastActivity();
      }
      
      // Only log state updates occasionally
      if (Date.now() % 30000 < 1000) {
        console.log('useAuth: Auth state updated to:', newAuthState);
      }
      
    } catch (error) {
      console.error('Error initializing auth:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null
      });
    } finally {
      // Set loading to false immediately - no artificial delay needed
      setIsLoading(false);
    }
  }, []);

  // Set authentication data using AuthManager
  const setAuth = useCallback((userData, token) => {
    try {
      // Generate session ID
      const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use AuthManager to store auth data
      AuthManager.login(userData, token, sessionId);
      
      // Set cookie for browser refresh scenarios
      document.cookie = `auth_token=${token}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
      
      // Update local state
      setAuthState({
        isAuthenticated: true,
        user: userData,
        token: token
      });
      
      console.log('useAuth: Authentication data set successfully');
    } catch (error) {
      console.error('Error setting auth:', error);
    }
  }, []);

  // Clear authentication data
  const clearAuth = useCallback(() => {
    AuthManager.clearAuth();
    
    // Clear auth cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
    
    console.log('useAuth: Authentication data cleared');
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role) => {
    return authState.user && authState.user.role === role;
  }, [authState.user]);

  // Check if user is authorized for specific roles
  const isAuthorized = useCallback((allowedRoles) => {
    if (!authState.user) return false;
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.includes(authState.user.role);
    }
    return authState.user.role === allowedRoles;
  }, [authState.user]);

  // Redirect to appropriate dashboard based on role
  const redirectToDashboard = useCallback(() => {
    if (!authState.user) return;
    
    // FIXED: Use getRedirectUrl to respect stored page instead of always going to dashboard
    const redirectUrl = AuthManager.getRedirectUrl();
    if (redirectUrl && redirectUrl !== '/login') {
      router.visit(redirectUrl);
    }
  }, [authState.user]);

  // Redirect to stored page or dashboard (now handles stored pages automatically)
  const redirectToStoredPage = useCallback(() => {
    if (!authState.user) return;
    
    const redirectUrl = AuthManager.getRedirectUrl();
    console.log('useAuth: Redirecting to stored page or dashboard:', redirectUrl);
    if (redirectUrl && redirectUrl !== '/login') {
      router.visit(redirectUrl);
    }
  }, [authState.user]);

  // Require authentication for protected routes (simplified)
  const requireAuth = useCallback((allowedRoles = null) => {
    // FIXED: Always allow access to prevent redirect loops on page refresh
    // Let the backend handle authentication - frontend should not redirect
    return true;
    
    // Don't redirect if still loading authentication state
    if (isLoading) {
      return true; // Allow component to render while loading
    }
    
    if (!authState.isAuthenticated) {
      return false;
    }
    
    if (allowedRoles && !isAuthorized(allowedRoles)) {
      redirectToDashboard();
      return false;
    }
    
    return true;
  }, [isLoading, authState.isAuthenticated, isAuthorized, redirectToDashboard]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call backend logout endpoint
      if (authState.token) {
        await fetch('/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authState.token}`,
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
          },
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      router.visit('/login');
    }
  }, [authState.token, clearAuth]);

  // Initialize auth on mount and track current page
  useEffect(() => {
    // Store current page before initializing auth
    const currentPath = window.location.pathname;
    AuthManager.storeCurrentPage(currentPath);
    
    initializeAuth();
    
    // REDUCED FREQUENCY: Periodic sync with AuthManager to prevent desync
    // Reduced from 1 second to 30 seconds to prevent excessive checks
    const syncInterval = setInterval(() => {
      // Skip sync if redirect is in progress to prevent interference
      const redirectInProgress = sessionStorage.getItem('auth_redirect_in_progress');
      if (redirectInProgress === 'true') {
        return;
      }
      
      const managerAuth = AuthManager.isAuthenticated();
      const currentAuth = authState.isAuthenticated;
      
      if (managerAuth !== currentAuth) {
        console.log('useAuth: Detected auth state desync, reinitializing');
        initializeAuth();
      }
    }, 30000); // Check every 30 seconds instead of 5 seconds
    
    return () => clearInterval(syncInterval);
  }, [initializeAuth]);

  // Track page changes when authenticated (throttled)
  useEffect(() => {
    if (authState.isAuthenticated) {
      // Throttle page tracking to prevent excessive calls
      const throttleTimeout = setTimeout(() => {
        AuthManager.trackPageChange();
      }, 1000);
      
      return () => clearTimeout(throttleTimeout);
    }
  }, [authState.isAuthenticated]);

  // Track page changes on route changes (for Inertia.js) - REMOVED REDUNDANT EFFECT
  // This is now handled by the initialization effect

  // Listen for storage changes (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === AuthManager.TOKEN_KEY || e.key === AuthManager.USER_KEY) {
        console.log('useAuth: Storage change detected, reinitializing auth');
        initializeAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [initializeAuth]);

  // Track page changes on navigation - REMOVED REDUNDANT EFFECT
  // Page tracking is now handled by the throttled effect above

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    authToken: authState.token,
    setAuth,
    clearAuth,
    logout,
    hasRole,
    isAuthorized,
    requireAuth,
    redirectToDashboard,
    redirectToStoredPage,
    updateActivity: AuthManager.updateLastActivity
  };
};

export default useAuth;
