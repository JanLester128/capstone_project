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

// Initialize authentication manager and page persistence
AuthManager.init();
setupPagePersistence();

// Set up axios response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('Axios: 401 Unauthorized detected');
      
      // Only redirect if not already on login page and user is not authenticated
      if (window.location.pathname !== '/login' && !AuthManager.isAuthenticated()) {
        console.log('Axios: Clearing auth and redirecting to login');
        AuthManager.clearAuth();
        window.location.href = '/login';
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
      <AuthPersistence>
        <App {...props} />
      </AuthPersistence>
    );
  },
});
