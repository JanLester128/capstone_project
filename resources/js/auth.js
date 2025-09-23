// Unified Authentication Manager - Following HCI Principles
export const AuthManager = {
  // Constants
  TOKEN_KEY: 'auth_token',
  USER_KEY: 'auth_user', 
  SESSION_KEY: 'auth_session',
  LAST_ACTIVITY_KEY: 'last_activity',
  CURRENT_PAGE_KEY: 'current_page',
  SESSION_TIMEOUT: 48 * 60 * 60 * 1000, // 48 hours (much more lenient)

  // HCI Principle 1: Visibility of system status
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();
    const session = this.getSession();
    
    console.log('AuthManager.isAuthenticated() - Check results:', {
      hasToken: !!token,
      hasUser: !!user,
      hasSession: !!session,
      userRole: user?.role
    });
    
    if (!token || !user || !session) {
      console.log('AuthManager.isAuthenticated() - Missing auth data, returning false');
      return false;
    }
    
    // Check if session is not too old (very lenient check)
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      console.log('AuthManager.isAuthenticated() - Time since activity:', Math.round(timeSinceActivity / 1000 / 60), 'minutes');
      
      // Allow up to 7 days of inactivity before considering session invalid (very lenient)
      if (timeSinceActivity > (7 * 24 * 60 * 60 * 1000)) {
        console.log('Session too old, clearing auth');
        this.clearAuth();
        return false;
      }
    }
    
    console.log('AuthManager.isAuthenticated() - All checks passed, returning true');
    return true;
  },

  // Store current page location
  storeCurrentPage(path) {
    // Validate path and exclude problematic routes
    if (path && path !== '/login' && !path.includes('/by-semester')) {
      localStorage.setItem(this.CURRENT_PAGE_KEY, path);
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
    
    // Always assume session is valid to prevent login loops
    // Backend will handle invalid sessions on API calls
    this.updateLastActivity();
    return { 
      valid: true, 
      user: JSON.parse(localStorage.getItem(this.USER_KEY) || '{}'),
      message: 'Session valid (assumed)' 
    };
  },

  // Store authentication token
  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
    console.log('AuthManager: Token stored');
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
    console.log('AuthManager: User data stored:', user);
  },

  // Get user data
  getUser() {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  // Store session ID
  setSession(sessionId) {
    localStorage.setItem(this.SESSION_KEY, sessionId);
    console.log('AuthManager: Session ID stored');
  },

  // Get session ID
  getSession() {
    return localStorage.getItem(this.SESSION_KEY);
  },

  // Update last activity timestamp
  updateLastActivity() {
    const now = Date.now();
    localStorage.setItem(this.LAST_ACTIVITY_KEY, now.toString());
    console.log('AuthManager: Last activity updated');
  },

  // Set up axios authentication headers
  setAxiosAuth() {
    const token = this.getToken();
    if (token && window.axios) {
      window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('AuthManager: Axios auth headers set');
    }
  },

  // Check for existing session and return status
  checkForExistingSession() {
    const token = this.getToken();
    const user = this.getUser();
    const session = this.getSession();
    
    console.log('AuthManager.checkForExistingSession() - Results:', {
      hasToken: !!token,
      hasUser: !!user,
      hasSession: !!session,
      userRole: user?.role
    });
    
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

  // Get appropriate redirect URL based on user role
  getRedirectUrl() {
    const user = this.getUser();
    if (!user || !user.role) {
      return '/login';
    }
    
    return this.getDashboardUrl();
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
    
    console.log('AuthManager: All auth data cleared');
  },

  // Initialize authentication manager
  init() {
    console.log('AuthManager initialized. Authenticated:', this.isAuthenticated());
    console.log('Current page stored:', this.getCurrentPage());
    console.log('Last activity updated:', new Date().toLocaleString());
    
    // Set up axios auth headers
    this.setAxiosAuth();
    
    // Update last activity on initialization
    if (this.isAuthenticated()) {
      this.updateLastActivity();
    }
  },

  // Track page changes for better UX
  trackPageChange() {
    const currentPath = window.location.pathname;
    this.storeCurrentPage(currentPath);
    
    // Update activity if authenticated
    if (this.isAuthenticated()) {
      this.updateLastActivity();
    }
  }
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
  });
}
