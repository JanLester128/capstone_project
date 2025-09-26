import React, { useEffect } from 'react';
import { AuthManager } from '../../auth';

export default function AuthRedirect() {
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Validate session
      const sessionResult = await AuthManager.validateSession();
      
      if (sessionResult.valid) {
        // Get user and redirect URL (which now handles stored pages automatically)
        const user = AuthManager.getUser();
        if (user) {
          const redirectUrl = AuthManager.getRedirectUrl();
          console.log('AuthRedirect: Redirecting to:', redirectUrl);
          
          if (redirectUrl && redirectUrl !== '/login') {
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            window.location.href = `${baseUrl}${redirectUrl}`;
            return;
          }
        }
      }
      
      // If no valid session, redirect to login
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      window.location.href = `${baseUrl}/login`;
    };

    checkAuthAndRedirect();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Checking authentication...</p>
      </div>
    </div>
  );
}
