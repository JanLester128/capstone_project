import './bootstrap';
import '../css/app.css';
import { AuthManager } from './auth';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
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

// Get CSRF cookie on app startup
axios.get('/sanctum/csrf-cookie').then(() => {
    // CSRF cookie is now set
}).catch(error => {
    console.error('Failed to get CSRF cookie:', error);
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
  progress: {
    color: '#4B5563',
  },
});
