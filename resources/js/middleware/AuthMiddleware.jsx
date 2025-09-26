import React, { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { AuthManager } from '../auth';

/**
 * Authentication Middleware for Inertia.js pages
 * Handles page persistence and authentication checks
 */
const AuthMiddleware = {
  // Initialize authentication tracking for the current page
  init() {
    const currentPath = window.location.pathname;
    
    // Store current page for persistence on refresh
    AuthManager.storeCurrentPage(currentPath);
    
    // Update last activity
    if (AuthManager.isAuthenticated()) {
      AuthManager.updateLastActivity();
    }
    
    console.log('AuthMiddleware: Initialized for path:', currentPath);
  },

  // Check authentication and redirect if necessary
  checkAuth(allowedRoles = null) {
    const currentPath = window.location.pathname;
    
    // Skip auth check for public routes
    if (currentPath === '/login' || currentPath === '/' || currentPath === '/register') {
      return true;
    }

    // Check if user is authenticated
    if (!AuthManager.isAuthenticated()) {
      console.log('AuthMiddleware: User not authenticated, storing current page and redirecting');
      AuthManager.storeCurrentPage(currentPath);
      router.visit('/login');
      return false;
    }

    const user = AuthManager.getUser();
    if (!user) {
      console.log('AuthMiddleware: No user data found, redirecting to login');
      router.visit('/login');
      return false;
    }

    // Check role authorization if specified
    if (allowedRoles) {
      const userRole = user.role?.toLowerCase();
      const allowed = Array.isArray(allowedRoles) 
        ? allowedRoles.map(role => role.toLowerCase()).includes(userRole)
        : allowedRoles.toLowerCase() === userRole;

      if (!allowed) {
        console.log('AuthMiddleware: User not authorized for this page, redirecting to dashboard');
        const dashboardUrl = AuthManager.getDashboardUrl();
        router.visit(dashboardUrl);
        return false;
      }
    }

    // Validate current page for user role
    if (!AuthManager.isValidPageForUser(currentPath, user.role)) {
      console.log('AuthMiddleware: Invalid page for user role, redirecting to dashboard');
      const dashboardUrl = AuthManager.getDashboardUrl();
      router.visit(dashboardUrl);
      return false;
    }

    return true;
  },

  // Handle page changes and track them
  handlePageChange() {
    const currentPath = window.location.pathname;
    
    if (AuthManager.isAuthenticated()) {
      AuthManager.storeCurrentPage(currentPath);
      AuthManager.updateLastActivity();
    }
  }
};

/**
 * React Hook for using AuthMiddleware in components
 */
export const useAuthMiddleware = (allowedRoles = null) => {
  useEffect(() => {
    // Initialize middleware
    AuthMiddleware.init();
    
    // Check authentication
    AuthMiddleware.checkAuth(allowedRoles);
    
    // Set up page change listener
    const handlePopState = () => {
      AuthMiddleware.handlePageChange();
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [allowedRoles]);

  // Track page changes on route updates
  useEffect(() => {
    AuthMiddleware.handlePageChange();
  }, [window.location.pathname]);
};

export default AuthMiddleware;
