import { AuthManager } from '../auth';

/**
 * Simple page authentication utility
 * Handles page persistence on browser refresh
 */
export const initPageAuth = (allowedRoles = null) => {
  // Store current page for persistence
  const currentPath = window.location.pathname;
  AuthManager.storeCurrentPage(currentPath);
  
  // Update last activity if authenticated
  if (AuthManager.isAuthenticated()) {
    AuthManager.updateLastActivity();
  }
  
  console.log('Page Auth: Initialized for', currentPath);
};

/**
 * Initialize page authentication when DOM is ready
 */
export const setupPagePersistence = () => {
  // Store current page on page load
  const currentPath = window.location.pathname;
  
  // Only store valid authenticated pages
  if (currentPath && currentPath !== '/login' && currentPath !== '/') {
    AuthManager.storeCurrentPage(currentPath);
  }
  
  // Set up page change tracking
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    const newPath = window.location.pathname;
    if (AuthManager.isAuthenticated()) {
      AuthManager.storeCurrentPage(newPath);
    }
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    const newPath = window.location.pathname;
    if (AuthManager.isAuthenticated()) {
      AuthManager.storeCurrentPage(newPath);
    }
  };
  
  // Track popstate events (back/forward buttons)
  window.addEventListener('popstate', () => {
    const newPath = window.location.pathname;
    if (AuthManager.isAuthenticated()) {
      AuthManager.storeCurrentPage(newPath);
    }
  });
  
  console.log('Page persistence setup complete');
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupPagePersistence);
}
