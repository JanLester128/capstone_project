import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { AuthManager } from './auth';
import AuthPersistence from './components/AuthPersistence';
import { setupPagePersistence } from './utils/pageAuth';
import axios from 'axios';
import { router } from '@inertiajs/react';

// Configure axios globally for Laravel web authentication
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Set CSRF token from meta tag
const token = document.head.querySelector('meta[name="csrf-token"]');
if (token) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
} else {
    console.error('CSRF token not found: https://laravel.com/docs/csrf#csrf-x-csrf-token');
}

// Make axios available globally
window.axios = axios;

// Initialize authentication manager only
AuthManager.init();
// DISABLED: setupPagePersistence() - AuthPersistence component handles this now
// setupPagePersistence();

// Set up axios defaults and interceptors
// SECURITY FIX: Add authentication headers to all requests
axios.interceptors.request.use(
  (config) => {
    const token = AuthManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // console.log('🔐 Axios: Added auth token to request'); // DISABLED
    }
    
    // Ensure CSRF token is included
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Set up axios response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // FIXED: Handle session conflicts (401 with session_conflict flag)
    if (error.response?.status === 401 && error.response?.data?.session_conflict) {
      console.log('🚨 Session conflict detected - user logged in elsewhere');
      AuthManager.handleSessionConflict();
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      // console.log('Axios: 401 Unauthorized detected'); // DISABLED
      
      // FIXED: Check for redirect in progress to prevent loops
      const redirectInProgress = sessionStorage.getItem('auth_redirect_in_progress') || 
                                sessionStorage.getItem('login_redirect_in_progress');
      
      if (redirectInProgress === 'true') {
        // console.log('Axios: Redirect already in progress, skipping'); // DISABLED
        return Promise.reject(error);
      }
      
      // FIXED: More lenient check - only redirect if we have no auth data at all
      const hasAuthData = AuthManager.getToken() && AuthManager.getUser();
      
      if (window.location.pathname !== '/login' && !hasAuthData) {
        // console.log('Axios: No auth data found - REDIRECT DISABLED to prevent infinite loop'); // DISABLED
        
        // DISABLED: Redirect that was causing infinite loop
        // sessionStorage.setItem('auth_redirect_in_progress', 'true');
        // AuthManager.clearAuth();
        // setTimeout(() => {
        //   window.location.href = '/login';
        // }, 100);
      } else if (hasAuthData) {
        // console.log('Axios: 401 but user has auth data, might be temporary server issue'); // DISABLED
        // Don't redirect if user has auth data - might be temporary server issue
      }
    }
    return Promise.reject(error);
  }
);

// Track page changes with Inertia router
router.on('navigate', (event) => {
  // Track page change after navigation
  setTimeout(() => {
    AuthManager.trackPageChange();
  }, 100);
});

// FIXED: Handle Inertia errors including session conflicts
router.on('error', (errors) => {
  // Check if any error indicates session conflict
  if (errors && typeof errors === 'object') {
    const errorValues = Object.values(errors);
    const hasSessionConflict = errorValues.some(error => 
      typeof error === 'string' && error.includes('session conflict')
    );
    
    if (hasSessionConflict) {
      console.log('🚨 Session conflict detected in Inertia response');
      AuthManager.handleSessionConflict();
    }
  }
});

// Inertia app setup
createInertiaApp({
  resolve: (name) => {
    console.log('🔍 Inertia resolving component:', name);
    const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
    // Check both .jsx and .js extensions
    const page = pages[`./Pages/${name}.jsx`] || pages[`./Pages/${name}.js`];
    
    console.log('🔍 Looking for:', `./Pages/${name}.jsx`);
    console.log('🔍 Found page:', !!page);
    
    if (!page) {
      console.error(`Page ${name} not found. Available pages:`, Object.keys(pages));
      throw new Error(`Page ${name} not found. Check file name and path!`);
    }
    
    console.log('✅ Inertia loading component:', name);
    return page.default; // must be default export
  },
  setup({ el, App, props }) {
    const root = createRoot(el);

    root.render(
      // TEMPORARILY DISABLED: AuthPersistence to test navigation
      <App {...props} />
      // <AuthPersistence>
      //   <App {...props} />
      // </AuthPersistence>
    );
  },
});
