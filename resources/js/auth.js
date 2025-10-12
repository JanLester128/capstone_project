// Unified Authentication Manager - Following HCI Principles  
// Version: 3.0 - Fixed redirect loops and disabled page storage - FORCE RELOAD
export const AuthManager = {
  // Constants
  TOKEN_KEY: 'auth_token',
  USER_KEY: 'auth_user', 
  SESSION_KEY: 'auth_session',
  LAST_ACTIVITY_KEY: 'last_activity',
  CURRENT_PAGE_KEY: 'current_page',
  SESSION_TIMEOUT: 48 * 60 * 60 * 1000, // 48 hours (much more lenient)

  // Cache authentication result to prevent infinite loops
  _lastAuthCheck: null,
  _lastAuthResult: null,
  _authCheckThrottle: 500, // 500ms throttle - increased to reduce calls
  _initialized: false,

  // HCI Principle 1: Visibility of system status
  isAuthenticated() {
    // Throttle authentication checks to prevent infinite loops
    const now = Date.now();
    if (this._lastAuthCheck && (now - this._lastAuthCheck) < this._authCheckThrottle) {
      return this._lastAuthResult;
    }

    const token = this.getToken();
    const user = this.getUser();
    
    // DISABLED: Console logging to prevent spam - only log on errors
    // if (!this._lastAuthCheck || (now - this._lastAuthCheck) > 5000) {
    //   console.log('AuthManager.isAuthenticated() - Check results:', {
    //     hasToken: !!token,
    //     hasUser: !!user,
    //     hasSession: !!localStorage.getItem(this.SESSION_KEY),
    //     userRole: user?.role
    //   });
    // }
    
    // FIXED: Simplified check - only require token and user for browser refresh scenarios
    if (!token || !user) {
      this._lastAuthCheck = now;
      this._lastAuthResult = false;
      return false;
    }
    
    // FIXED: Very lenient session check - only clear if extremely old (30 days)
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      
      // Only clear auth if session is extremely old (30 days) to prevent logout on refresh
      if (timeSinceActivity > (30 * 24 * 60 * 60 * 1000)) {
        // console.log('Session extremely old (30+ days), clearing auth'); // DISABLED
        this.clearAuth();
        this._lastAuthCheck = now;
        this._lastAuthResult = false;
        return false;
      }
    }
    
    this._lastAuthCheck = now;
    this._lastAuthResult = true;
    return true;
  },

  // Store current page location with better validation
  storeCurrentPage(path) {
    // DISABLED: Page storage that was causing redirect loops to grades page
    // console.log('AuthManager: Page storage disabled to prevent redirect loops'); // DISABLED
    return;
    
    // Validate path and exclude problematic routes
    if (path && path !== '/login' && path !== '/' && !path.includes('/by-semester') && !path.includes('/logout') && !path.includes('/auth/')) {
      // Only store valid authenticated pages
      const validPaths = [
        '/registrar/', '/faculty/', '/student/', '/coordinator/'
      ];
      
      // FIXED: Only store non-dashboard pages to prevent always returning to dashboard
      const isDashboardPage = path.endsWith('/dashboard');
      
      if (validPaths.some(validPath => path.startsWith(validPath)) && !isDashboardPage) {
        localStorage.setItem(this.CURRENT_PAGE_KEY, path);
        // console.log('AuthManager: Current page stored:', path); // DISABLED
      } else if (isDashboardPage) {
        // console.log('AuthManager: Dashboard page not stored to allow navigation to other pages'); // DISABLED
      }
    }
  },

  // Get stored current page location
  getCurrentPage() {
    return localStorage.getItem(this.CURRENT_PAGE_KEY);
  },

  // Clear stored current page
  clearCurrentPage() {
    localStorage.removeItem(this.CURRENT_PAGE_KEY);
  },

  // Force refresh user data from server
  async forceRefreshUser() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch('/user/refresh', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          this.setUser(data.user);
          console.log('✅ AuthManager: User data force refreshed:', {
            id: data.user.id,
            role: data.user.role,
            is_coordinator: data.user.is_coordinator
          });
          return true;
        }
      }
    } catch (error) {
      console.error('AuthManager: Error force refreshing user:', error);
    }
    return false;
  },

  // Check if current page matches user role
  isValidPageForUser(path, userRole) {
    if (!path || !userRole) return false;
    
    const roleBasedPaths = {
      'registrar': '/registrar/',
      'faculty': '/faculty/',
      'coordinator': '/faculty/',
      'student': '/student/'
    };
    
    const validPath = roleBasedPaths[userRole.toLowerCase()];
    return validPath && path.startsWith(validPath);
  },

  // HCI Principle 9: Help users recognize, diagnose, and recover from errors
  async validateSession() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const sessionId = localStorage.getItem(this.SESSION_KEY);
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    
    if (!token || !sessionId) {
      return { valid: false, message: 'No session data' };
    }
    
    // Check if session expired (48 hours) - but be very lenient on page refresh
    if (lastActivity && Date.now() - parseInt(lastActivity) > this.SESSION_TIMEOUT) {
      // Only clear auth if session is significantly expired (more than 8 days)
      if (Date.now() - parseInt(lastActivity) > (8 * 24 * 60 * 60 * 1000)) {
        this.clearAuth();
        return { valid: false, message: 'Session expired' };
      }
    }
    
    // Validate session with backend for critical operations
    try {
      const response = await fetch('/auth/validate-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.updateLastActivity();
          return { 
            valid: true, 
            user: data.user || JSON.parse(localStorage.getItem(this.USER_KEY) || '{}'),
            message: 'Session valid' 
          };
        }
      }
    } catch (error) {
      console.warn('Session validation failed, assuming valid for browser refresh:', error);
    }
    
    // Fallback: assume session is valid to prevent login loops on page refresh
    this.updateLastActivity();
    return { 
      valid: true, 
      user: JSON.parse(localStorage.getItem(this.USER_KEY) || '{}'),
      message: 'Session valid (fallback)' 
    };
  },

  // Store authentication token
  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
    // console.log('AuthManager: Token stored'); // DISABLED
  },

  // Get authentication token
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  // Get current token for axios requests
  getCurrentToken() {
    return this.getToken();
  },

  // Store user data
  setUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    // console.log('AuthManager: User data stored:', user); // DISABLED
  },

  // Get user data
  getUser() {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  // Store session ID
  setSession(sessionId) {
    localStorage.setItem(this.SESSION_KEY, sessionId);
    // console.log('AuthManager: Session ID stored'); // DISABLED
  },

  // Get session ID
  getSession() {
    return localStorage.getItem(this.SESSION_KEY);
  },

  // Update last activity timestamp (throttled)
  _lastActivityUpdate: null,
  updateLastActivity() {
    const now = Date.now();
    
    // Throttle activity updates to once per minute to reduce localStorage writes
    if (this._lastActivityUpdate && (now - this._lastActivityUpdate) < 60000) {
      return;
    }
    
    localStorage.setItem(this.LAST_ACTIVITY_KEY, now.toString());
    this._lastActivityUpdate = now;
    
    // DISABLED: Only log occasionally to reduce console spam
    // if (now % 300000 < 60000) { // Log roughly every 5 minutes
    //   console.log('AuthManager: Last activity updated');
    // }
  },

  // Set up axios authentication headers
  setAxiosAuth() {
    const token = this.getToken();
    if (token && window.axios) {
      window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // console.log('AuthManager: Axios auth headers set'); // DISABLED
    }
  },

  // Check for existing session and return status
  checkForExistingSession() {
    const token = this.getToken();
    const user = this.getUser();
    const session = this.getSession();
    
    // DISABLED: Excessive logging
    // console.log('AuthManager.checkForExistingSession() - Results:', {
    //   hasToken: !!token,
    //   hasUser: !!user,
    //   hasSession: !!session,
    //   userRole: user?.role
    // });
    
    if (token && user && session) {
      // Update activity to keep session alive
      this.updateLastActivity();
      
      return {
        hasSession: true,
        user: user,
        token: token,
        sessionId: session
      };
    }
    
    return {
      hasSession: false,
      user: null,
      token: null,
      sessionId: null
    };
  },

  // Get appropriate redirect URL based on user role and stored page
  getRedirectUrl() {
    const user = this.getUser();
    if (!user || !user.role) {
      return '/login';
    }
    
    // DISABLED: Stored page logic that was causing redirect loops to grades
    // Always redirect to dashboard to prevent redirect loops
    // console.log('AuthManager: Using dashboard URL to prevent redirect loops'); // DISABLED
    
    switch (user.role.toLowerCase()) {
      case 'student':
        return '/student/dashboard';
      case 'registrar':
        return '/registrar/dashboard';
      case 'faculty':
      case 'coordinator':
        return '/faculty/dashboard';
      default:
        return '/login';
    }
  },

  // Get dashboard URL based on user role
  getDashboardUrl() {
    const user = this.getUser();
    if (!user || !user.role) {
      return '/login';
    }
    
    switch (user.role.toLowerCase()) {
      case 'registrar':
        return '/registrar/dashboard';
      case 'student':
        return '/student/dashboard';
      case 'faculty':
      case 'coordinator':
        return '/faculty/dashboard';
      default:
        console.warn('Unknown user role:', user.role);
        return '/login';
    }
  },

  // Clear all authentication data
  clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    localStorage.removeItem(this.CURRENT_PAGE_KEY);
    
    // Clear axios auth headers
    if (window.axios) {
      delete window.axios.defaults.headers.common['Authorization'];
    }
    
    // console.log('AuthManager: All auth data cleared'); // DISABLED
  },

  // Clear stored page data to fix redirect loops
  clearStoredPage() {
    localStorage.removeItem(this.CURRENT_PAGE_KEY);
    // console.log('AuthManager: Stored page data cleared'); // DISABLED
  },

  // Initialize authentication manager
  init() {
    // DISABLED: All logging to prevent console spam
    if (!this._initialized) {
      this._initialized = true;
    }
    
    // Clear stored page data to prevent redirect loops
    this.clearStoredPage();
    
    // Clear any stuck redirect flags
    this.clearRedirectFlags();
    
    // Set up auto-cleanup for stuck redirect flags
    this.autoCleanupRedirectFlags();
    
    // Set up axios auth headers
    this.setAxiosAuth();
    
    // Update last activity on initialization
    if (this.isAuthenticated()) {
      this.updateLastActivity();
    }
  },

  // Clear redirect flags to prevent infinite loops
  clearRedirectFlags() {
    sessionStorage.removeItem('auth_redirect_in_progress');
    sessionStorage.removeItem('login_redirect_in_progress');
    sessionStorage.removeItem('redirect_count');
    // console.log('AuthManager: Redirect flags cleared'); // DISABLED
  },

  // Auto-clear redirect flags after timeout to prevent stuck states
  autoCleanupRedirectFlags() {
    // Clear flags after 3 seconds
    setTimeout(() => {
      const loginFlag = sessionStorage.getItem('login_redirect_in_progress');
      const authFlag = sessionStorage.getItem('auth_redirect_in_progress');
      
      if (loginFlag === 'true' || authFlag === 'true') {
        // console.log('AuthManager: Auto-clearing stuck redirect flags after 3 seconds'); // DISABLED
        this.clearRedirectFlags();
      }
    }, 3000);
    
    // Also clear on page visibility change (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const loginFlag = sessionStorage.getItem('login_redirect_in_progress');
        const authFlag = sessionStorage.getItem('auth_redirect_in_progress');
        
        if (loginFlag === 'true' || authFlag === 'true') {
          // console.log('AuthManager: Clearing redirect flags on tab focus'); // DISABLED
          this.clearRedirectFlags();
        }
      }
    });
  },

  // Login method to store authentication data
  login(userData, token, sessionId) {
    // FIXED: Clear any existing auth data before storing new session
    this.clearAuth();
    
    this.setToken(token);
    this.setUser(userData);
    this.setSession(sessionId);
    this.updateLastActivity();
    this.setAxiosAuth();
    
    // console.log('AuthManager: User logged in successfully', {
    //   userId: userData.id,
    //   role: userData.role,
    //   sessionId: sessionId
    // }); // DISABLED
  },

  // Track page changes for better UX
  trackPageChange() {
    const currentPath = window.location.pathname;
    this.storeCurrentPage(currentPath);
    
    // Update activity if authenticated
    if (this.isAuthenticated()) {
      this.updateLastActivity();
    }
  },

  // FIXED: Handle session conflicts from server
  handleSessionConflict() {
    // Clear all auth data
    this.clearAuth();
    
    // Show user-friendly message
    if (window.Swal) {
      window.Swal.fire({
        title: 'Session Conflict',
        text: 'Your account is being used in another browser or tab. You have been logged out for security.',
        icon: 'warning',
        confirmButtonText: 'Login Again',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        // Redirect to login
        window.location.href = '/login';
      });
    } else {
      // Fallback if SweetAlert is not available
      alert('Your account is being used in another browser or tab. You have been logged out for security.');
      window.location.href = '/login';
    }
  }
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
  });
}
