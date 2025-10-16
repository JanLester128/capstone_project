import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { AuthManager } from '../../auth';

export default function AuthPersistence() {
    useEffect(() => {
        // Check authentication status on component mount
        const checkAuth = async () => {
            try {
                // Check if user is authenticated
                const isAuth = AuthManager.isAuthenticated();
                const user = AuthManager.getUser();
                
                console.log('🔍 AuthPersistence: Checking authentication...', {
                    isAuthenticated: isAuth,
                    user: user,
                    currentPath: window.location.pathname
                });

                // If not authenticated and not on login page, redirect to login
                if (!isAuth && !window.location.pathname.includes('/login')) {
                    console.log('🚫 AuthPersistence: Not authenticated, redirecting to login');
                    router.visit('/login');
                    return;
                }

                // If authenticated but on login page, redirect to dashboard
                if (isAuth && window.location.pathname.includes('/login')) {
                    const redirectUrl = AuthManager.getRedirectUrl();
                    console.log('✅ AuthPersistence: Authenticated on login page, redirecting to:', redirectUrl);
                    router.visit(redirectUrl);
                    return;
                }

                // Update last activity
                if (isAuth) {
                    AuthManager.updateLastActivity();
                }

            } catch (error) {
                console.error('❌ AuthPersistence: Error checking authentication:', error);
            }
        };

        // Run initial check
        checkAuth();

        // Set up periodic check (every 5 minutes)
        const interval = setInterval(checkAuth, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return null; // This component doesn't render anything
}
