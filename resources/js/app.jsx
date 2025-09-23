import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { AuthManager } from './auth';
import { AuthCheck } from './middleware/AuthCheck';
import axios from 'axios';
import { router } from '@inertiajs/react';

// Configure axios globally
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Make axios available globally
window.axios = axios;

// Initialize authentication manager
AuthManager.init();

// Set up axios request interceptor to add auth headers
axios.interceptors.request.use(
  (config) => {
    const token = AuthManager.getCurrentToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Set up axios response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('Axios: 401 Unauthorized - clearing auth and redirecting to login');
      AuthManager.clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Get CSRF cookie on app startup
axios.get('/sanctum/csrf-cookie').then(() => {
    // CSRF cookie is now set
    console.log('CSRF cookie set');
}).catch(error => {
    console.error('Failed to set CSRF cookie:', error);
});

// Track page changes with Inertia router
router.on('navigate', (event) => {
  // Track page change after navigation
  setTimeout(() => {
    AuthManager.trackPageChange();
  }, 100);
});

// Inertia app setup
createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
    // Check both .jsx and .js extensions
    const page = pages[`./Pages/${name}.jsx`] || pages[`./Pages/${name}.js`];

    if (!page) {
      console.error(`Page ${name} not found. Available pages:`, Object.keys(pages));
      throw new Error(`Page ${name} not found. Check file name and path!`);
    }

    return page.default; // must be default export
  },
  setup({ el, App, props }) {
    const root = createRoot(el);

    root.render(
      <AuthCheck>
        <App {...props} />
      </AuthCheck>
    );
  },
});
