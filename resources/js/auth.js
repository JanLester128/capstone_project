// Unified Authentication Manager - Following HCI Principles
export const AuthManager = {
  // Constants
  TOKEN_KEY: 'auth_token',
  USER_KEY: 'auth_user', 
  SESSION_KEY: 'auth_session',
  LAST_ACTIVITY_KEY: 'last_activity',
  CURRENT_PAGE_KEY: 'current_page',
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours

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
    
    // Check if session is not too old (more lenient check)
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      console.log('AuthManager.isAuthenticated() - Time since activity:', Math.round(timeSinceActivity / 1000 / 60), 'minutes');
      
      // Allow up to 48 hours of inactivity before considering session invalid
      if (timeSinceActivity > (48 * 60 * 60 * 1000)) {
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
    
    // Check if session expired (24 hours) - but be more lenient on page refresh
    if (lastActivity && Date.now() - parseInt(lastActivity) > this.SESSION_TIMEOUT) {
      // Only clear auth if session is significantly expired (more than 25 hours)
      if (Date.now() - parseInt(lastActivity) > (this.SESSION_TIMEOUT + 60 * 60 * 1000)) {
        this.clearAuth();
        return { valid: false, message: 'Session expired' };
      }
    }
    
    // Validate token with backend to handle database resets
    try {
      const response = await fetch('http://localhost:8000/auth/validate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Session-ID': sessionId
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          this.updateLastActivity();
          return { 
            valid: true, 
            user: data.user || JSON.parse(localStorage.getItem(this.USER_KEY) || '{}'),
            message: 'Session valid' 
          };
        }
      }
      
      // Token invalid or user not found (database reset scenario)
      console.log('Token validation failed - clearing auth data');
      this.clearAuth();
      return { valid: false, message: 'Invalid session - please login again' };
      
    } catch (error) {
      console.error('Session validation error:', error);
      // On network error, assume session is valid for better UX
      // This prevents login loops when the server is temporarily unavailable
      this.updateLastActivity();
      return { 
        valid: true, 
        user: JSON.parse(localStorage.getItem(this.USER_KEY) || '{}'),
        message: 'Session validation failed - using cached data' 
      };
    }
  },

  // HCI Principle 4: Consistency and standards - Unified token management
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getCurrentToken() {
    return this.getToken();
  },

  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  },

  // Session management
  setSession(sessionId) {
    localStorage.setItem(this.SESSION_KEY, sessionId);
    this.updateLastActivity();
  },

  getSession() {
    return localStorage.getItem(this.SESSION_KEY);
  },

  updateLastActivity() {
    localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
  },

  isSessionExpired() {
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    if (!lastActivity) return true;
    
    const timeDiff = Date.now() - parseInt(lastActivity);
    return timeDiff > this.SESSION_TIMEOUT;
  },

  // Check for existing session to prevent multiple logins
  checkForExistingSession() {
    const session = this.getSession();
    const token = this.getToken();
    
    if (session && token && !this.isSessionExpired()) {
      return {
        hasSession: true,
        user: this.getUser(),
        role: this.getCurrentUserRole()
      };
    }
    
    return { hasSession: false };
  },

  // HCI Principle 2: Match between system and real world - Clear role identification
  getCurrentUserRole() {
    const user = this.getUser();
    return user ? user.role : null;
  },

  // HCI Principle 6: Recognition rather than recall - Store complete user context
  getUser() {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user data:', e);
        this.clearAuth();
        return null;
      }
    }
    return null;
  },

  setUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  // HCI Principle 8: Aesthetic and minimalist design - Clean API setup
  setAxiosAuth() {
    const token = this.getToken();
    if (token && window.axios) {
      window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },

  // HCI Principle 3: User control and freedom - Clear logout capability
  clearAuth() {
    // Clear all authentication data from localStorage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    localStorage.removeItem(this.CURRENT_PAGE_KEY);
    
    // Clear axios authorization header
    if (window.axios) {
      delete window.axios.defaults.headers.common['Authorization'];
    }
    
    console.log('Auth cleared - all localStorage items removed');
  },

  // HCI Principle 7: Flexibility and efficiency of use - Role-based navigation
  getDashboardUrl() {
    const role = this.getCurrentUserRole();
    
    const dashboardMap = {
      'registrar': '/registrar/dashboard',
      'faculty': '/faculty/dashboard', 
      'coordinator': '/faculty/dashboard',
      'student': '/student/dashboard'
    };
    
    return dashboardMap[role] || '/login';
  },

  // Get redirect URL - prioritize stored current page over dashboard
  getRedirectUrl() {
    const currentPage = this.getCurrentPage();
    if (currentPage && currentPage !== '/login') {
      return currentPage;
    }
    return this.getDashboardUrl();
  },

  // HCI Principle 5: Error prevention - Validate before storing
  login(user, token, sessionId) {
    if (!user || !token || !sessionId) {
      throw new Error('Invalid login data provided');
    }
    
    this.setUser(user);
    this.setToken(token);
    this.setSession(sessionId);
    this.setAxiosAuth();
    
    return this.getRedirectUrl();
  },

  // Initialize authentication on page load
  init() {
    this.setAxiosAuth();
    
    // Store current page if authenticated and not on login page
    if (this.isAuthenticated()) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && !currentPath.startsWith('/auth/change-password')) {
        this.storeCurrentPage(currentPath);
      }
    }
    
    // Set up axios interceptor for session conflicts
    if (window.axios) {
      window.axios.interceptors.response.use(
        response => response,
        error => {
          if (error.response && error.response.status === 409 && error.response.data.session_conflict) {
            // Handle session conflict
            this.clearAuth();
            window.location.href = 'http://localhost:8000/login';
          }
          return Promise.reject(error);
        }
      );
    }
    
    console.log('AuthManager initialized. Authenticated:', this.isAuthenticated());
    console.log('Current page stored:', this.getCurrentPage());
  },

  // Track page changes for authenticated users
  trackPageChange() {
    if (this.isAuthenticated()) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && !currentPath.startsWith('/auth/change-password')) {
        this.storeCurrentPage(currentPath);
        console.log('Page tracked:', currentPath);
      }
    }
  }
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
  });
}
