import React from "react";
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';

// Inertia app setup
createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
    // Check both .jsx and .js extensions
    const page = pages[`./Pages/${name}.jsx`] || pages[`./Pages/${name}.js`];

    if (!page) {
      throw new Error(`Page ${name} not found. Check file name and path!`);
    }

    return page.default; // must be default export
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
});
