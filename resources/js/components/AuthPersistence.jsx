import React, { useEffect } from 'react';
import { AuthManager } from '../auth';

/**
 * AuthPersistence Component
 * Handles authentication persistence on page refresh without causing redirect loops
 */
export default function AuthPersistence({ children }) {
  useEffect(() => {
    const currentPath = window.location.pathname;
    
    // FIXED: Add comprehensive loop prevention
    const redirectInProgress = sessionStorage.getItem('auth_redirect_in_progress') || 
                              sessionStorage.getItem('login_redirect_in_progress');
    
    if (redirectInProgress === 'true') {
      console.log('AuthPersistence: Redirect in progress, skipping auth check');
      return;
    }
    
    // Skip auth persistence for login and public pages
    if (currentPath === '/login' || currentPath === '/' || currentPath.includes('/auth/')) {
      console.log('AuthPersistence: On public page, skipping auth check');
      return;
    }
    
    // FIXED: More lenient authentication check for browser refresh
    const hasAuthData = AuthManager.getToken() && AuthManager.getUser();
    
    if (hasAuthData) {
      // Update last activity to keep session alive
      AuthManager.updateLastActivity();
      
      // Store current page for persistence
      AuthManager.storeCurrentPage(currentPath);
      
      console.log('AuthPersistence: User has auth data, session maintained for:', currentPath);
    } else {
      // FIXED: Only redirect if we're on a protected route and have no auth data
      const protectedRoutes = ['/registrar/', '/faculty/', '/student/', '/coordinator/'];
      const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
      
      if (isProtectedRoute && currentPath !== '/login') {
        console.log('AuthPersistence: No auth data on protected route - REDIRECT DISABLED to prevent loop');
        
        // DISABLED: Redirect that was causing infinite loop
        // sessionStorage.setItem('auth_redirect_in_progress', 'true');
        // AuthManager.clearAuth();
        // setTimeout(() => {
        //   window.location.href = '/login';
        // }, 100);
      }
    }
  }, []);

  // Always render children - no loading states to prevent flash
  return children;
}
