import { useEffect } from 'react';

export const AuthCheck = ({ children }) => {
  useEffect(() => {
    // Clear any stuck redirect flags only
    localStorage.removeItem('login_redirect_in_progress');
  }, []);

  // Just render children without any authentication logic
  return children;
};
