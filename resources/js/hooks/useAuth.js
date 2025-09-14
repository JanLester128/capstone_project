import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { AuthManager } from '../auth';

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
      const isAuth = AuthManager.isAuthenticated();
      const user = AuthManager.getUser();
      const token = AuthManager.getToken();
      
      setAuthState({
        isAuthenticated: isAuth,
        user: user,
        token: token
      });
      
      // Set axios headers if authenticated
      if (isAuth && token) {
        AuthManager.setAxiosAuth();
      }
      
      // Don't automatically redirect - let components handle their own authentication
    } catch (error) {
      console.error('Error initializing auth:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null
      });
    } finally {
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
      
      // Update local state
      setAuthState({
        isAuthenticated: true,
        user: userData,
        token: token
      });
    } catch (error) {
      console.error('Error setting auth:', error);
    }
  }, []);

  // Clear authentication data
  const clearAuth = useCallback(() => {
    AuthManager.clearAuth();
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
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
    
    const dashboardUrl = AuthManager.getDashboardUrl();
    if (dashboardUrl && dashboardUrl !== '/login') {
      router.visit(dashboardUrl);
    }
  }, [authState.user]);

  // Redirect to stored page or dashboard
  const redirectToStoredPage = useCallback(() => {
    if (!authState.user) return;
    
    const redirectUrl = AuthManager.getRedirectUrl();
    if (redirectUrl && redirectUrl !== '/login') {
      router.visit(redirectUrl);
    }
  }, [authState.user]);

  // Require authentication for protected routes
  const requireAuth = useCallback((allowedRoles = null) => {
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

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Track page changes when authenticated
  useEffect(() => {
    if (authState.isAuthenticated) {
      AuthManager.trackPageChange();
    }
  }, [authState.isAuthenticated]);

  // Listen for storage changes (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === AuthManager.TOKEN_KEY || e.key === AuthManager.USER_KEY) {
        initializeAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [initializeAuth]);

  // Track page changes on navigation
  useEffect(() => {
    const handlePopState = () => {
      if (authState.isAuthenticated) {
        AuthManager.trackPageChange();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authState.isAuthenticated]);

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
