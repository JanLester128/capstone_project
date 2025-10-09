/**
 * Redirect Utilities - Prevent infinite redirect loops
 * 
 * This utility helps manage redirect states and prevent infinite loops
 * between login and dashboard pages.
 */

export const RedirectUtils = {
  // Keys for sessionStorage
  REDIRECT_FLAG_KEY: 'auth_redirect_in_progress',
  REDIRECT_COUNT_KEY: 'redirect_count',
  MAX_REDIRECTS: 3,

  /**
   * Check if a redirect is currently in progress
   */
  isRedirectInProgress() {
    return sessionStorage.getItem(this.REDIRECT_FLAG_KEY) === 'true';
  },

  /**
   * Set redirect flag to prevent loops
   */
  setRedirectFlag() {
    sessionStorage.setItem(this.REDIRECT_FLAG_KEY, 'true');
    console.log('RedirectUtils: Redirect flag set');
  },

  /**
   * Clear redirect flag
   */
  clearRedirectFlag() {
    sessionStorage.removeItem(this.REDIRECT_FLAG_KEY);
    console.log('RedirectUtils: Redirect flag cleared');
  },

  /**
   * Increment redirect count and check if max reached
   */
  incrementRedirectCount() {
    const currentCount = parseInt(sessionStorage.getItem(this.REDIRECT_COUNT_KEY) || '0');
    const newCount = currentCount + 1;
    sessionStorage.setItem(this.REDIRECT_COUNT_KEY, newCount.toString());
    
    console.log(`RedirectUtils: Redirect count: ${newCount}/${this.MAX_REDIRECTS}`);
    
    if (newCount >= this.MAX_REDIRECTS) {
      console.error('RedirectUtils: Maximum redirects reached, preventing infinite loop');
      this.clearAllFlags();
      return false; // Prevent further redirects
    }
    
    return true; // Allow redirect
  },

  /**
   * Clear redirect count
   */
  clearRedirectCount() {
    sessionStorage.removeItem(this.REDIRECT_COUNT_KEY);
    console.log('RedirectUtils: Redirect count cleared');
  },

  /**
   * Clear all redirect-related flags
   */
  clearAllFlags() {
    this.clearRedirectFlag();
    this.clearRedirectCount();
    sessionStorage.removeItem('login_redirect_in_progress');
    console.log('RedirectUtils: All redirect flags cleared');
  },

  /**
   * Safe redirect with loop prevention
   */
  safeRedirect(router, url, options = {}) {
    // Check if redirect is already in progress
    if (this.isRedirectInProgress()) {
      console.log('RedirectUtils: Redirect already in progress, skipping');
      return false;
    }

    // Check redirect count
    if (!this.incrementRedirectCount()) {
      console.error('RedirectUtils: Too many redirects, aborting');
      return false;
    }

    // Set redirect flag
    this.setRedirectFlag();

    console.log(`RedirectUtils: Performing safe redirect to: ${url}`);

    // Perform redirect with cleanup
    router.visit(url, {
      ...options,
      onFinish: () => {
        // Clear flags after navigation completes
        this.clearAllFlags();
        if (options.onFinish) {
          options.onFinish();
        }
      },
      onError: () => {
        // Clear flags on error too
        this.clearAllFlags();
        if (options.onError) {
          options.onError();
        }
      }
    });

    return true;
  },

  /**
   * Emergency reset - clears all auth and redirect data
   */
  emergencyReset() {
    console.warn('RedirectUtils: Performing emergency reset');
    
    // Clear all redirect flags
    this.clearAllFlags();
    
    // Clear auth data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_session');
    
    // Clear auth cookies
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Clear session storage
    sessionStorage.clear();
    
    console.log('RedirectUtils: Emergency reset completed');
  }
};

export default RedirectUtils;
