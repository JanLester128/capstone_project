import React, { useEffect } from 'react';
import { AuthManager } from '../auth';

/**
 * AuthPersistence Component
 * Handles authentication persistence on page refresh without causing redirect loops
 */
export default function AuthPersistence({ children }) {
  useEffect(() => {
    const currentPath = window.location.pathname;
    
    // Skip auth persistence for login and public pages
    if (currentPath === '/login' || currentPath === '/' || currentPath.includes('/auth/')) {
      return;
    }
    
    // Check if user is authenticated
    if (AuthManager.isAuthenticated()) {
      // Update last activity to keep session alive
      AuthManager.updateLastActivity();
      
      // Store current page for persistence
      AuthManager.storeCurrentPage(currentPath);
      
      console.log('AuthPersistence: User authenticated, session maintained');
    } else {
      // Only redirect if not already on login page
      if (currentPath !== '/login') {
        console.log('AuthPersistence: User not authenticated, redirecting to login');
        window.location.href = '/login';
      }
    }
  }, []);

  // Always render children - no loading states to prevent flash
  return children;
}
